import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../constants/theme';

export type RootStackParamList = {
  Welcome: undefined;
  Auth: undefined;
  LocationPicker: undefined;
  MainFlow: undefined;
  BusinessFlow: undefined;
  BagDetails: undefined;
  ReservationReview: undefined;
  ReservationConfirmed: undefined;
};

export type MainTabParamList = {
  Discover: undefined;
  Map: undefined;
  Reservations: undefined;
  Profile: undefined;
};

export type BusinessTabParamList = {
  Overview: undefined;
  PublishBag: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const MainTab = createBottomTabNavigator<MainTabParamList>();
const BusinessTab = createBottomTabNavigator<BusinessTabParamList>();

const DummyScreen = () => null;
import WelcomeScreen from '../screens/WelcomeScreen';
import HomeScreen from '../screens/HomeScreen';
import MapScreen from '../screens/MapScreen';
import BagDetailScreen from '../screens/BagDetailScreen';
import CheckoutScreen from '../screens/CheckoutScreen';
import OrderSuccessScreen from '../screens/OrderSuccessScreen';
import MyOrdersScreen from '../screens/MyOrdersScreen';
import ProfileScreen from '../screens/ProfileScreen';
import BusinessDashboardScreen from '../screens/BusinessDashboardScreen';
import CreateBagScreen from '../screens/CreateBagScreen';
import AuthScreen from '../screens/AuthScreen';
import LocationPickerScreen from '../screens/LocationPickerScreen';

function MainTabNavigator() {
  return (
    <MainTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
        },
      }}
    >
      <MainTab.Screen name="Discover" component={HomeScreen} options={{ tabBarLabel: 'Keşfet', tabBarIcon: ({color}) => <Ionicons name="compass-outline" size={24} color={color} /> }} />
      <MainTab.Screen name="Map" component={MapScreen} options={{ tabBarLabel: 'Harita', tabBarIcon: ({color}) => <Ionicons name="map-outline" size={24} color={color} /> }} />
      <MainTab.Screen name="Reservations" component={MyOrdersScreen} options={{ tabBarLabel: 'Rezervasyonlarım', tabBarIcon: ({color}) => <Ionicons name="receipt-outline" size={24} color={color} /> }} />
      <MainTab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Profil', tabBarIcon: ({color}) => <Ionicons name="person-outline" size={24} color={color} /> }} />
    </MainTab.Navigator>
  );
}

function BusinessTabNavigator() {
  return (
    <BusinessTab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.card,
          borderTopColor: COLORS.border,
        },
      }}
    >
      <BusinessTab.Screen name="Overview" component={BusinessDashboardScreen} options={{ tabBarLabel: 'Genel Bakış', tabBarIcon: ({color}) => <Ionicons name="home-outline" size={24} color={color} /> }} />
      <BusinessTab.Screen name="PublishBag" component={CreateBagScreen} options={{ tabBarLabel: 'Yayınla', tabBarIcon: ({color}) => <Ionicons name="add-circle-outline" size={24} color={color} /> }} />
    </BusinessTab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: COLORS.background }
        }}
      >
        <Stack.Screen name="Welcome" component={WelcomeScreen} />
        <Stack.Screen name="Auth" component={AuthScreen} />
        <Stack.Screen name="LocationPicker" component={LocationPickerScreen} />
        <Stack.Screen name="MainFlow" component={MainTabNavigator} />
        <Stack.Screen name="BusinessFlow" component={BusinessTabNavigator} />
        <Stack.Screen name="BagDetails" component={BagDetailScreen} />
        <Stack.Screen name="ReservationReview" component={CheckoutScreen} />
        <Stack.Screen name="ReservationConfirmed" component={OrderSuccessScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
