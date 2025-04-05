
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AppRegistry } from 'react-native-web';

// Register the app
AppRegistry.registerComponent('TravelBuddy', () => App);

// Initialize web app
if (typeof document !== 'undefined') {
  const rootTag = document.getElementById('root');
  if (rootTag) {
    createRoot(rootTag).render(<App />);
  }
}
