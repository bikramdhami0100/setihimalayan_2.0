import { DefaultTheme } from 'react-native-paper';
import { colors } from './colors';

export const theme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.primary,
    secondary: colors.secondary,
    accent: colors.accent,
    background: colors.background,
    surface: colors.surface,
    text: colors.text,
    error: colors.error,
    disabled: colors.disabled,
    placeholder: colors.placeholder,
    backdrop: colors.overlay,
    inverseOnSurface: '#FFFFFF',
    outline: colors.border,
  },
  roundness: 8,
};

export const adminTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.backgroundDark,
    secondary: colors.secondary,
    accent: colors.warning,
    background: colors.backgroundDark,
    surface: '#1E293B',
    text: colors.textLight,
    error: colors.error,
    disabled: colors.disabled,
    placeholder: '#64748B',
  },
  roundness: 8,
};