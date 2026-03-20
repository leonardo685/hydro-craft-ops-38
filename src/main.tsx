import { createRoot } from 'react-dom/client'
import { ThemeProvider } from "next-themes"
import App from './App.tsx'
import './index.css'

const container = document.getElementById("root")!;
const root = createRoot(container);

const AppWithTheme = () => (
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <App />
  </ThemeProvider>
);

root.render(<AppWithTheme />);
