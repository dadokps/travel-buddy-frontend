
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';

type ButtonProps = {
  title: string;
  onPress: () => void;
  type?: 'primary' | 'secondary' | 'outline';
  loading?: boolean;
  disabled?: boolean;
  style?: object;
};

const AppButton: React.FC<ButtonProps> = ({ 
  title, 
  onPress, 
  type = 'primary', 
  loading = false,
  disabled = false,
  style
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        styles[`${type}Button`],
        disabled && styles.disabledButton,
        style
      ]}
      onPress={onPress}
      disabled={disabled || loading}
    >
      {loading ? (
        <ActivityIndicator color={type === 'outline' ? '#3498db' : 'white'} />
      ) : (
        <Text style={[styles.text, styles[`${type}Text`]]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 8,
    minWidth: 120,
  },
  primaryButton: {
    backgroundColor: '#3498db',
  },
  secondaryButton: {
    backgroundColor: '#2ecc71',
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#3498db',
  },
  disabledButton: {
    opacity: 0.6,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  primaryText: {
    color: 'white',
  },
  secondaryText: {
    color: 'white',
  },
  outlineText: {
    color: '#3498db',
  },
});

export default AppButton;
