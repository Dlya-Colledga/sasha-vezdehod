import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { View } from 'react-native';
import YoutubePlayer from 'react-native-youtube-iframe';
import type { VideoStageHandle, VideoStageProps } from './types';
import { extractYoutubeId } from '../utils/detectVideoKind';

const YoutubeVideoStage = forwardRef<VideoStageHandle, VideoStageProps>(
  ({ url, isHost, onHostEvent }, ref) => {
    const playerRef = useRef<any>(null);
    const [playing, setPlaying] = useState(isHost);
    const [height, setHeight] = useState(220);
    const suppress = useRef(false);
    const videoId = extractYoutubeId(url) || '';

    useImperativeHandle(ref, () => ({
      async applySync(_action, time, playingNow) {
        suppress.current = true;
        try {
          const current = (await playerRef.current?.getCurrentTime()) ?? 0;
          if (Math.abs(current - time) > 1.2) playerRef.current?.seekTo(time, true);
        } catch {
          // player not ready yet
        }
        setPlaying(playingNow);
        setTimeout(() => {
          suppress.current = false;
        }, 300);
      },
    }));

    const onStateChange = useCallback(
      (state: string) => {
        if (suppress.current || !isHost || !onHostEvent) return;
        if (state === 'playing') {
          playerRef.current?.getCurrentTime().then((t: number) => onHostEvent('play', t, true));
        } else if (state === 'paused') {
          playerRef.current?.getCurrentTime().then((t: number) => onHostEvent('pause', t, false));
        }
      },
      [isHost, onHostEvent]
    );

    useEffect(() => {
      if (!isHost || !onHostEvent) return;
      const id = setInterval(async () => {
        if (suppress.current) return;
        try {
          const t = await playerRef.current?.getCurrentTime();
          if (typeof t === 'number') onHostEvent('timeupdate', t, playing);
        } catch {
          // ignore
        }
      }, 4000);
      return () => clearInterval(id);
    }, [isHost, onHostEvent, playing]);

    return (
      <View style={{ flex: 1 }} onLayout={(e) => setHeight(e.nativeEvent.layout.height)}>
        <YoutubePlayer
          ref={playerRef}
          height={height}
          videoId={videoId}
          play={playing}
          onChangeState={onStateChange}
          initialPlayerParams={{ controls: isHost, modestbranding: true }}
        />
      </View>
    );
  }
);

export default YoutubeVideoStage;
