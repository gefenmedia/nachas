import React from 'react';
import {Composition, type CalculateMetadataFunction} from 'remotion';
import {Main} from './Main';
import {horizontalLayout, verticalLayout} from './theme';
import type {Chunk, Episode, Scene, VideoProps} from './types';
import chunks from './data/chunks.json';
import scenes from './data/scenes.json';
import episode from './data/episode.json';

const FPS = 30;

const defaultProps: VideoProps = {
  narrationSrc: 'narration.mp3',
  // MUSIC_PATH: drop an instrumental MP3 into public/music/ and point this at it ('' = no music)
  musicSrc: (episode as Episode).music.src,
  musicVolume: 0.5,
  title: (episode as Episode).title,
  episode: episode as Episode,
  chunks: chunks as Chunk[],
  scenes: scenes as Scene[],
};

const calc: CalculateMetadataFunction<VideoProps> = ({props}) => ({
  durationInFrames: Math.ceil(((props.episode.narrationDurationMs + props.episode.endCardMs) / 1000) * FPS),
});

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="BulletproofBitachonVertical"
      component={(p: VideoProps) => <Main {...p} layout={verticalLayout} />}
      width={1080}
      height={1920}
      fps={FPS}
      durationInFrames={300}
      defaultProps={defaultProps}
      calculateMetadata={calc}
    />
    <Composition
      id="BulletproofBitachonHorizontal"
      component={(p: VideoProps) => <Main {...p} layout={horizontalLayout} />}
      width={1920}
      height={1080}
      fps={FPS}
      durationInFrames={300}
      defaultProps={defaultProps}
      calculateMetadata={calc}
    />
  </>
);
