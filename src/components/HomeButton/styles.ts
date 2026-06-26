import styled from 'styled-components/native';

interface Props {
  $home: boolean;
}

export const Container = styled.View<Props>`
  top: 3px;
  width: 45px;
  height: 30px;
  justify-content: center;
  border-radius: 10px;
  align-items: center;
  background: ${props => (props.$home ? '#fff' : '#000')};
  border-left-width: 3px;
  border-left-color: #13bef2;
  border-right-width: 3px;
  border-right-color: #f2db13;
`;

export const Button = styled.TouchableOpacity.attrs({
  activeOpacity: 1,
})``;
