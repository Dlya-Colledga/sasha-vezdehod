import { forwardRef } from 'react';
import type { VideoKind } from '../types';
import type { VideoStageHandle, VideoStageProps } from './types';
import DirectVideoStage from './DirectVideoStage';
import YoutubeVideoStage from './YoutubeVideoStage';
import OtherWebViewStage from './OtherWebViewStage';

interface Props extends VideoStageProps {
  kind: VideoKind;
}

const VideoStage = forwardRef<VideoStageHandle, Props>(({ kind, ...rest }, ref) => {
  if (kind === 'youtube') return <YoutubeVideoStage ref={ref} {...rest} />;
  if (kind === 'other') return <OtherWebViewStage ref={ref} {...rest} />;
  return <DirectVideoStage ref={ref} {...rest} />;
});

export default VideoStage;
