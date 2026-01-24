/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import './styles/global.css';

console.log('Apple Music Client starting...');

const root = document.getElementById('root');

if (!root) {
  console.error('Root element not found!');
  throw new Error('Root element not found');
}

console.log('Root element found, rendering App...');

try {
  render(() => <App />, root);
  console.log('App rendered successfully');
} catch (err) {
  console.error('Failed to render App:', err);
  // Show error in UI
  root.innerHTML = `<div style="color: red; padding: 20px;">
    <h1>Failed to render App</h1>
    <pre>${err}</pre>
  </div>`;
}
