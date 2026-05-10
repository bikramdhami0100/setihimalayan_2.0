import { StyleSheet } from 'react-native';

export const colors = {
  primary: '#1E3A8A',
  primaryLight: '#DBEAFE',
  secondary: '#0D9488',
  accent: '#F97316',
  background: '#F8FAFC',
  backgroundDark: '#0F172A',
  surface: '#FFFFFF',
  text: '#1E293B',
  textLight: '#F1F5F9',
  textSecondary: '#64748B',
  placeholder: '#94A3B8',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  errorLight: '#FEF2F2',
  info: '#3B82F6',
  border: '#E2E8F0',
  divider: '#CBD5E1',
  disabled: '#94A3B8',
  overlay: 'rgba(0,0,0,0.5)',
  white: '#FFFFFF',
  black: '#000000',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  blue50: '#EFF6FF',
  blue100: '#DBEAFE',
  blue200: '#BFDBFE',
  blue500: '#3B82F6',
  blue700: '#1D4ED8',
  blue900: '#1E3A8A',
  red50: '#FEF2F2',
  red100: '#FEE2E2',
  red500: '#EF4444',
  green50: '#F0FDF4',
  green100: '#DCFCE7',
  green500: '#22C55E',
  amber100: '#FEF3C7',
  cyan100: '#CFFAFE',
  indigo100: '#E0E7FF',
  sky400: '#38BDF8',
  slate50: '#F8FAFC',
  slate100: '#F1F5F9',
  slate200: '#E2E8F0',
  slate300: '#CBD5E1',
  slate400: '#94A3B8',
  slate500: '#64748B',
  slate600: '#475569',
  slate700: '#334155',
  slate800: '#1E293B',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
  '4xl': 40,
};

export const borderRadius = {
  sm: 6,
  md: 8,
  lg: 12,
  xl: 14,
  '2xl': 16,
  '3xl': 20,
  full: 9999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  '2xl': 20,
  '3xl': 24,
  '4xl': 30,
  '5xl': 36,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
};

export const shadow = {
  sm: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  xl: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
};

export const commonStyles = StyleSheet.create({
  // Layout
  flex: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexRowCenter: { flexDirection: 'row', alignItems: 'center' },
  flexRowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  flexCenter: { justifyContent: 'center', alignItems: 'center' },
  flexWrap: { flexWrap: 'wrap' },

  // Containers
  screenContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['2xl'],
    padding: spacing.lg,
    ...shadow.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius['3xl'],
    padding: spacing.xl,
    marginBottom: spacing.lg,
    ...shadow.sm,
  },

  // Text
  heading1: {
    fontSize: fontSize['3xl'],
    fontWeight: fontWeight.black,
    color: colors.text,
  },
  heading2: {
    fontSize: fontSize['2xl'],
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  heading3: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.text,
  },
  bodyText: {
    fontSize: fontSize.md,
    color: colors.text,
  },
  bodySmall: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  caption: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
  },
  label: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
    color: colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Buttons
  buttonPrimary: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow.md,
  },
  buttonPrimaryText: {
    color: colors.white,
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: borderRadius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDanger: {
    backgroundColor: colors.error,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing['2xl'],
    borderRadius: borderRadius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Inputs
  input: {
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
    fontSize: fontSize.md,
  },

  // Badge / Pill
  badge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    alignSelf: 'flex-start',
  },
  badgeText: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.bold,
  },

  // Icon container
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },

  // Status indicators
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // Shadow wrapper
  shadowSm: { ...shadow.sm },
  shadowMd: { ...shadow.md },
  shadowLg: { ...shadow.lg },

  // Center
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Padding helpers
  p2: { padding: spacing.sm },
  p4: { padding: spacing.lg },
  px4: { paddingHorizontal: spacing.lg },
  py2: { paddingVertical: spacing.sm },
  py4: { paddingVertical: spacing.lg },

  // Margin helpers  
  mb2: { marginBottom: spacing.sm },
  mb4: { marginBottom: spacing.lg },
  mt2: { marginTop: spacing.sm },
  mt4: { marginTop: spacing.lg },

  // Gap helper (flexbox gap not supported on RN < 0.71, use margin on children)
  gap2: { gap: spacing.sm },
  gap4: { gap: spacing.lg },
});
