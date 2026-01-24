/* @refresh reload */
import { render } from 'solid-js/web';
import MiniPlayer from './components/MiniPlayer/MiniPlayer';
import './styles/global.css';

const root = document.getElementById('root');

if (root) {
  render(() => <MiniPlayer />, root);
}
