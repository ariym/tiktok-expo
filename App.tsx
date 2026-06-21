import React from 'react';

import './src/setupNativeGlobals';

import { Provider as PaperProvider } from 'react-native-paper';

import Routes from './src/routes';

const App: React.FC = () => {
  return (
    <PaperProvider settings={{ rippleEffectEnabled: false }}>
      <Routes />
    </PaperProvider>
  );
};

export default App;
