import React from 'react';
import {render} from 'react-dom';

import {App} from '../ui/components/App';

const rootElem = document.createElement('div');
rootElem.id = 'root';
document.body.appendChild(rootElem);

render(
  (
    <App />
  ),
  rootElem,
);
