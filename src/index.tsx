/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import './styles/global.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element not found');
}

try {
  render(() => <App />, root);
} catch (err) {
  console.error('Failed to render App:', err);
  root.innerHTML = `<div style="color: white; padding: 20px; background: #0a0a0a;">
    <h1>Failed to start Tuffahi</h1>
    <pre>${err}</pre>
  </div>`;
}
