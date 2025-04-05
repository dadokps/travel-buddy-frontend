
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../../navigation/types';
import { useAuth } from '../../context/AuthContext';
import InputField from '../../components/InputField';
import AppButton from '../../components/AppButton';

type Props = NativeStackScreenProps<AuthStackParamList, 'SignIn'>;

const SignInScreen: React.FC<Props> = ({ navigation }) => {
  const { signIn, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{email?: string; password?: string}>({});

  const validateForm = () => {
    const newErrors: {email?: string; password?: string} = {};
    
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Email is invalid';
    
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async () => {
    if (validateForm()) {
      setLoading(true);
      await signIn(email, password);
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Travel Buddy</Text>
        <Text style={styles.tagline}>Connect with travelers, explore together</Text>
      </View>
      
      <View style={styles.formContainer}>
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
          placeholder="Enter your password"
          secureTextEntry
          error={errors.password}
        />
        
        <TouchableOpacity
          onPress={() => navigation.navigate('ForgotPassword')}
          style={styles.forgotPasswordLink}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>
        
        <AppButton
          title="Sign In"
          onPress={handleSignIn}
          loading={loading}
        />
        
        <View style={styles.orContainer}>
          <View style={styles.divider} />
          <Text style={styles.orText}>OR</Text>
          <View style={styles.divider} />
        </View>
        
        <AppButton
          title="Sign In with Google"
          onPress={signInWithGoogle}
          type="outline"
        />
        
        <View style={styles.signupContainer}>
          <Text style={styles.noAccountText}>Don't have an account? </Text>
          <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
            <Text style={styles.signupLink}>Sign Up</Text>
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
  logoContainer: {
    alignItems: 'center',
    marginVertical: 40,
  },
  logoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
  },
  tagline: {
    fontSize: 16,
    color: '#7f8c8d',
    marginTop: 8,
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
  forgotPasswordLink: {
    alignSelf: 'flex-end',
    marginBottom: 16,
  },
  forgotPasswordText: {
    color: '#3498db',
    fontSize: 14,
  },
  orContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 16,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  orText: {
    color: '#7f8c8d',
    paddingHorizontal: 10,
    fontSize: 14,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 16,
  },
  noAccountText: {
    fontSize: 14,
    color: '#7f8c8d',
  },
  signupLink: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: 'bold',
  },
});

export default SignInScreen;
