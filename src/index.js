import React from 'react';
import { createRoot } from 'react-dom/client';
import Pet from './components/Pet/Pet';
import './styles/global.css';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Pet />); 