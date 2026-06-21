import React from 'react';

import { NavigationContainer } from '@react-navigation/native';

import AppRoutes from './routes/app.routes';

const Routes: React.FC = () => {
  return (
    <NavigationContainer documentTitle={{ enabled: false }}>
      <AppRoutes />
    </NavigationContainer>
  );
};

export default Routes;
