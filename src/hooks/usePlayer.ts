import { playerStore } from '../stores/player';

export function usePlayer() {
  return {
    state: playerStore.state,
    play: playerStore.play,
    pause: playerStore.pause,
    togglePlayPause: playerStore.togglePlayPause,
    skipNext: playerStore.skipNext,
    skipPrevious: playerStore.skipPrevious,
    seekTo: playerStore.seekTo,
    setVolume: playerStore.setVolume,
    playMedia: playerStore.playMedia,
    playSong: playerStore.playSong,
    playAlbum: playerStore.playAlbum,
    playPlaylist: playerStore.playPlaylist,
  };
}
