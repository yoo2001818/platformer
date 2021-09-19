import React from 'react';
import {render} from 'react-dom';

import {App} from '../ui/components/App';

const rootElem = document.createElement('div');
document.body.appendChild(rootElem);

render(
  (
    <App />
  ),
  rootElem,
);
