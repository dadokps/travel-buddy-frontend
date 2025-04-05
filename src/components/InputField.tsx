
import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';

type InputFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  label?: string;
  secureTextEntry?: boolean;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
};

const InputField: React.FC<InputFieldProps> = ({
  value,
  onChangeText,
  placeholder,
  label,
  secureTextEntry = false,
  error,
  keyboardType = 'default',
  autoCapitalize = 'none',
}) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        style={[styles.input, error && styles.inputError]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
    color: '#333',
    fontWeight: '500',
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    backgroundColor: 'white',
    fontSize: 16,
  },
  inputError: {
    borderColor: '#e74c3c',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 12,
    marginTop: 4,
  },
});

export default InputField;
