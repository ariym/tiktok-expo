import React, { useState, useEffect } from 'react';
import { Text, View, StatusBar } from 'react-native';

import {
  FontAwesome,
  MaterialCommunityIcons,
  AntDesign,
} from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { CameraType, CameraView, useCameraPermissions } from 'expo-camera';

import {
  Container,
  RecordButton,
  Header,
  Row,
  Button,
  Description,
} from './styles';

const Record: React.FC = () => {
  const [permission, requestPermission] = useCameraPermissions();
  const [type, setType] = useState<CameraType>('back');

  const navigation = useNavigation();
  useEffect(() => {
    async function requestCameraAccess(): Promise<void> {
      await requestPermission();
      StatusBar.setHidden(true);
    }
    requestCameraAccess();
  }, [requestPermission]);

  if (!permission) {
    return <View />;
  }
  if (!permission.granted) {
    return <Text>No access to camera</Text>;
  }

  return (
    <CameraView style={{ flex: 1 }} facing={type}>
      <Container>
        <Header>
          <Button
            onPress={() => {
              StatusBar.setHidden(false);
              navigation.goBack();
            }}
          >
            <AntDesign name="close" size={28} color="#fff" />
          </Button>
          <Button>
            <Row>
              <FontAwesome name="music" size={18} color="#fff" />
              <Description>Sons</Description>
            </Row>
          </Button>
          <Button
            onPress={() => {
              setType(
                type === 'back'
                  ? 'front'
                  : 'back',
              );
            }}
          >
            <MaterialCommunityIcons
              name="rotate-right"
              size={28}
              color="#fff"
            />
          </Button>
        </Header>
        <RecordButton />
      </Container>
    </CameraView>
  );
};

export default Record;
