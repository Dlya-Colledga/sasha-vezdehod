import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import type { VideoStageHandle, VideoStageProps } from './types';

const DirectVideoStage = forwardRef<VideoStageHandle, VideoStageProps>(
  ({ url, isHost, onHostEvent }, ref) => {
    const player = useVideoPlayer(url, (p) => {
      p.timeUpdateEventInterval = 3;
      if (isHost) p.play();
    });
    const suppress = useRef(false);
    const isFirstUrl = useRef(true);

    useImperativeHandle(ref, () => ({
      applySync(_action, time, playing) {
        suppress.current = true;
        if (Math.abs(player.currentTime - time) > 1.2) player.currentTime = time;
        if (playing) player.play();
        else player.pause();
        setTimeout(() => {
          suppress.current = false;
        }, 250);
      },
    }));

    useEffect(() => {
      if (!isHost || !onHostEvent) return;
      const playingSub = player.addListener('playingChange', ({ isPlaying }) => {
        if (suppress.current) return;
        onHostEvent(isPlaying ? 'play' : 'pause', player.currentTime, isPlaying);
      });
      const timeSub = player.addListener('timeUpdate', ({ currentTime }) => {
        if (suppress.current) return;
        onHostEvent('timeupdate', currentTime, player.playing);
      });
      return () => {
        playingSub.remove();
        timeSub.remove();
      };
    }, [isHost, onHostEvent, player]);

    useEffect(() => {
      if (isFirstUrl.current) {
        isFirstUrl.current = false;
        return;
      }
      player.replaceAsync(url).catch(() => {});
    }, [url, player]);

    return (
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        nativeControls={isHost}
        fullscreenOptions={{ enable: true }}
      />
    );
  }
);

export default DirectVideoStage;
