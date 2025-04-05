
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const ForgotPasswordScreen: React.FC<Props> = ({ navigation }) => {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const validateEmail = () => {
    if (!email.trim()) {
      setError('Email is required');
      return false;
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Email is invalid');
      return false;
    }
    setError('');
    return true;
  };

  const handleResetPassword = async () => {
    if (validateEmail()) {
      setLoading(true);
      await resetPassword(email);
      setLoading(false);
      setSubmitted(true);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      
      {!submitted ? (
        <>
          <Text style={styles.description}>
            Enter your email address and we'll send you a link to reset your password.
          </Text>
          
          <InputField
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="Enter your email"
            keyboardType="email-address"
            error={error}
          />
          
          <AppButton
            title="Send Reset Link"
            onPress={handleResetPassword}
            loading={loading}
          />
        </>
      ) : (
        <>
          <Text style={styles.successMessage}>
            If an account exists with this email, you'll receive a password reset link.
            Please check your email.
          </Text>
          
          <AppButton
            title="Back to Sign In"
            onPress={() => navigation.navigate('SignIn')}
            type="outline"
          />
        </>
      )}
      
      <TouchableOpacity 
        style={styles.backLink}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backLinkText}>← Back to Sign In</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 16,
    marginTop: 40,
  },
  description: {
    fontSize: 16,
    color: '#7f8c8d',
    marginBottom: 24,
  },
  successMessage: {
    fontSize: 16,
    color: '#2ecc71',
    marginBottom: 24,
    lineHeight: 22,
  },
  backLink: {
    marginTop: 24,
  },
  backLinkText: {
    color: '#3498db',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default ForgotPasswordScreen;
