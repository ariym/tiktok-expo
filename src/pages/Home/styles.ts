import styled from 'styled-components/native';

interface Props {
  $active: boolean;
}

export const Container = styled.View`
  flex: 1;
  background: #000;
`;

export const Separator = styled.Text`
  color: #fff;
  font-size: 15px;
  opacity: 0.2;
`;

export const Header = styled.View`
  height: 10%;
  flex-direction: row;
  position: absolute;
  align-self: center;
  z-index: 10;
  align-items: center;
  margin-top: 5%;
`;
export const Text = styled.Text<Props>`
  color: #fff;
  font-size: ${props => (props.$active ? '20px' : '18px')};
  padding: 5px;
  font-weight: bold;
  opacity: ${props => (props.$active ? '1' : '0.5')};
`;

export const Tab = styled.TouchableOpacity.attrs({
  activeOpacity: 1,
})``;

export const RefreshButton = styled.TouchableOpacity.attrs({
  activeOpacity: 0.8,
})`
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  margin-left: 12px;
`;

export const CenterMessage = styled.View`
  flex: 1;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

export const MessageText = styled.Text`
  color: #fff;
  font-size: 16px;
  margin-top: 12px;
  text-align: center;
`;

export const Feed = styled.View`
  flex: 1;
  z-index: -1;
  position: absolute;
`;
