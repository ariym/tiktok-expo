import React, { useState } from 'react';
import { StatusBar, Platform } from 'react-native';

import {
  MaterialCommunityIcons,
  AntDesign,
  FontAwesome,
} from '@expo/vector-icons';
import { createMaterialBottomTabNavigator } from '@react-navigation/material-bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';

import HomeButtom from '../components/HomeButton';
import Discover from '../pages/Discover';
import Home from '../pages/Home';
import Inbox from '../pages/Inbox';
import Me from '../pages/Me';
import Record from '../pages/Record';

const Tab = createMaterialBottomTabNavigator();
const Stack = createStackNavigator();

const AppRoutes: React.FC = () => {
  const [home, setHome] = useState(true);

  StatusBar.setBarStyle('dark-content');

  if (Platform.OS === 'android') StatusBar.setBackgroundColor('#fff');

  if (home) {
    StatusBar.setHidden(true);
    if (Platform.OS === 'android') {
      StatusBar.setBackgroundColor('#fff');
      StatusBar.setBarStyle('light-content');
    }
  } else {
    StatusBar.setHidden(false);
  }

  return (
    <Tab.Navigator
      shifting={false}
      barStyle={{
        backgroundColor: home ? '#000' : '#fff',
      }}
      initialRouteName="Home"
      activeColor={home ? '#fff' : '#000'}
    >
      <Tab.Screen
        name="Play"
        component={Home}
        listeners={{
          focus: () => setHome(true),
          blur: () => setHome(false),
        }}
        options={{
          tabBarLabel: 'Play',
          tabBarIcon: ({ color }) => (
            <FontAwesome name="play-circle" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="QPL"
        component={Discover}
        options={{
          tabBarLabel: 'QPL',
          tabBarIcon: ({ color }) => (
            <AntDesign name="edit" size={24} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Chat"
        component={Record}
        listeners={({ navigation }) => ({
          tabPress: e => {
            // Prevent default action
            e.preventDefault();

            // Do something with the `navigation` object
            navigation.navigate('Chat');
          },
        })}
        options={{
          tabBarLabel: '',
          tabBarIcon: () => <HomeButtom home={home} />,
        }}
      />
      <Tab.Screen
        name="DB"
        component={Inbox}
        options={{
          tabBarLabel: 'DB',
          tabBarIcon: ({ color }) => (
            <MaterialCommunityIcons
              name="database-outline"
              size={24}
              color={color}
            />
          ),
        }}
      />
      <Tab.Screen
        name="Detect"
        component={Me}
        options={{
          tabBarLabel: 'Detect',
          tabBarIcon: ({ color }) => (
            <AntDesign name="thunderbolt" size={24} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
};

const RootStackScreen: React.FC = () => {
  return (
    <Stack.Navigator screenOptions={{ presentation: 'modal' }}>
      <Stack.Screen
        name="Main"
        component={AppRoutes}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        options={{ headerShown: false }}
        name="Record"
        component={Record}
      />
    </Stack.Navigator>
  );
};

export default RootStackScreen;
