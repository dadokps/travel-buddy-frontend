
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignUp'>;

const SignUpScreen: React.FC<Props> = ({ navigation }) => {
  const { signUp } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});

  const validateForm = () => {
    const newErrors: {
      firstName?: string;
      lastName?: string;
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};
    
    if (!firstName.trim()) newErrors.firstName = 'First name is required';
    if (!lastName.trim()) newErrors.lastName = 'Last name is required';
    
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    if (!confirmPassword) newErrors.confirmPassword = 'Confirm password is required';
    else if (confirmPassword !== password) newErrors.confirmPassword = 'Passwords do not match';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignUp = async () => {
    if (validateForm()) {
      setLoading(true);
      await signUp(email, password, firstName, lastName);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Create Account</Text>
        <Text style={styles.subHeaderText}>Join Travel Buddy today</Text>
      </View>
      
      <View style={styles.formContainer}>
        <InputField
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
          placeholder="Enter your first name"
          autoCapitalize="words"
          error={errors.firstName}
        />
        
        <InputField
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
          placeholder="Enter your last name"
          autoCapitalize="words"
          error={errors.lastName}
        />
        
        <InputField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          error={errors.email}
        />
        
        <InputField
          label="Password"
          value={password}
          onChangeText={setPassword}
          placeholder="Create a password"
          secureTextEntry
          error={errors.password}
        />
        
        <InputField
          label="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm your password"
          secureTextEntry
          error={errors.confirmPassword}
        />
        
        <AppButton
          title="Sign Up"
          onPress={handleSignUp}
          loading={loading}
        />
        
        <View style={styles.signinContainer}>
          <Text style={styles.haveAccountText}>Already have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignIn')}>
            <Text style={styles.signinLink}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  headerContainer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#3498db',
  },
  subHeaderText: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 6,
  },
  formContainer: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  signinContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  haveAccountText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  signinLink: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: 'bold',
  },
});

export default SignUpScreen;
