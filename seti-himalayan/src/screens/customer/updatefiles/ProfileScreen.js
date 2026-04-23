// import React, { useState } from 'react';
// import { View, StyleSheet, ScrollView, Alert } from 'react-native';
// import { Text, TextInput, Button, Avatar, ActivityIndicator,Card } from 'react-native-paper';
// import { useAuth } from '../../hooks/useAuth';
// import useUIStore from '../../store/uiStore';
// import { colors } from '../../utils/colors';

// export default function ProfileScreen() {
//   const { user, updateProfile, changePassword, isLoading } = useAuth();
//   const { showSnackbar } = useUIStore();
//   const [isEditing, setIsEditing] = useState(false);
//   const [formData, setFormData] = useState({
//     full_name: user?.full_name || '',
//     email: user?.email || '',
//     phone: user?.phone || '',
//     address: user?.address || '',
//     city: user?.city || '',
//   });
//   const [passwordData, setPasswordData] = useState({
//     currentPassword: '',
//     newPassword: '',
//     confirmPassword: '',
//   });
//   const [showChangePassword, setShowChangePassword] = useState(false);

//   const handleUpdateProfile = async () => {
//     const result = await updateProfile(formData);
//     if (result.success) {
//       showSnackbar('Profile updated', 'success');
//       setIsEditing(false);
//     } else {
//       showSnackbar(result.message, 'error');
//     }
//   };

//   const handleChangePassword = async () => {
//     if (passwordData.newPassword !== passwordData.confirmPassword) {
//       showSnackbar('Passwords do not match', 'error');
//       return;
//     }
//     const result = await changePassword({
//       currentPassword: passwordData.currentPassword,
//       newPassword: passwordData.newPassword,
//     });
//     if (result.success) {
//       showSnackbar('Password changed', 'success');
//       setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
//       setShowChangePassword(false);
//     } else {
//       showSnackbar(result.message, 'error');
//     }
//   };

//   return (
//     <ScrollView style={styles.container}>
//       <View style={styles.avatarContainer}>
//         <Avatar.Icon size={80} icon="account" style={styles.avatar} />
//         <Text variant="titleLarge">{user?.full_name}</Text>
//         <Text variant="bodyMedium">{user?.email}</Text>
//         <Text variant="bodySmall">Role: {user?.role}</Text>
//       </View>

//       {!isEditing ? (
//         <View>
//           <Card style={styles.card}>
//             <Card.Content>
//               <Text variant="titleMedium">Personal Information</Text>
//               <View style={styles.infoRow}>
//                 <Text variant="bodyMedium">Full Name:</Text>
//                 <Text>{user?.full_name}</Text>
//               </View>
//               <View style={styles.infoRow}>
//                 <Text variant="bodyMedium">Email:</Text>
//                 <Text>{user?.email}</Text>
//               </View>
//               <View style={styles.infoRow}>
//                 <Text variant="bodyMedium">Phone:</Text>
//                 <Text>{user?.phone}</Text>
//               </View>
//               <View style={styles.infoRow}>
//                 <Text variant="bodyMedium">Address:</Text>
//                 <Text>{user?.address || 'Not set'}</Text>
//               </View>
//               <View style={styles.infoRow}>
//                 <Text variant="bodyMedium">City:</Text>
//                 <Text>{user?.city || 'Not set'}</Text>
//               </View>
//             </Card.Content>
//           </Card>
//           <Button mode="contained" onPress={() => setIsEditing(true)} style={styles.editButton}>
//             Edit Profile
//           </Button>
//           <Button mode="outlined" onPress={() => setShowChangePassword(!showChangePassword)} style={styles.passwordButton}>
//             Change Password
//           </Button>
//         </View>
//       ) : (
//         <View>
//           <Card style={styles.card}>
//             <Card.Content>
//               <Text variant="titleMedium">Edit Profile</Text>
//               <TextInput
//                 mode="outlined"
//                 label="Full Name"
//                 value={formData.full_name}
//                 onChangeText={(text) => setFormData({ ...formData, full_name: text })}
//                 style={styles.input}
//               />
//               <TextInput
//                 mode="outlined"
//                 label="Email"
//                 value={formData.email}
//                 onChangeText={(text) => setFormData({ ...formData, email: text })}
//                 keyboardType="email-address"
//                 style={styles.input}
//               />
//               <TextInput
//                 mode="outlined"
//                 label="Phone"
//                 value={formData.phone}
//                 onChangeText={(text) => setFormData({ ...formData, phone: text })}
//                 keyboardType="phone-pad"
//                 style={styles.input}
//               />
//               <TextInput
//                 mode="outlined"
//                 label="Address"
//                 value={formData.address}
//                 onChangeText={(text) => setFormData({ ...formData, address: text })}
//                 style={styles.input}
//               />
//               <TextInput
//                 mode="outlined"
//                 label="City"
//                 value={formData.city}
//                 onChangeText={(text) => setFormData({ ...formData, city: text })}
//                 style={styles.input}
//               />
//               <View style={styles.buttonRow}>
//                 <Button mode="outlined" onPress={() => setIsEditing(false)} style={styles.cancelButton}>
//                   Cancel
//                 </Button>
//                 <Button mode="contained" onPress={handleUpdateProfile} loading={isLoading} style={styles.saveButton}>
//                   Save
//                 </Button>
//               </View>
//             </Card.Content>
//           </Card>
//         </View>
//       )}

//       {showChangePassword && (
//         <Card style={styles.card}>
//           <Card.Content>
//             <Text variant="titleMedium">Change Password</Text>
//             <TextInput
//               mode="outlined"
//               label="Current Password"
//               value={passwordData.currentPassword}
//               onChangeText={(text) => setPasswordData({ ...passwordData, currentPassword: text })}
//               secureTextEntry
//               style={styles.input}
//             />
//             <TextInput
//               mode="outlined"
//               label="New Password"
//               value={passwordData.newPassword}
//               onChangeText={(text) => setPasswordData({ ...passwordData, newPassword: text })}
//               secureTextEntry
//               style={styles.input}
//             />
//             <TextInput
//               mode="outlined"
//               label="Confirm Password"
//               value={passwordData.confirmPassword}
//               onChangeText={(text) => setPasswordData({ ...passwordData, confirmPassword: text })}
//               secureTextEntry
//               style={styles.input}
//             />
//             <Button mode="contained" onPress={handleChangePassword} loading={isLoading} style={styles.updatePasswordButton}>
//               Update Password
//             </Button>
//           </Card.Content>
//         </Card>
//       )}
//     </ScrollView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: colors.background },
//   avatarContainer: { alignItems: 'center', padding: 20, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
//   avatar: { backgroundColor: colors.primary, marginBottom: 12 },
//   card: { margin: 16, marginBottom: 8, elevation: 2 },
//   infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
//   input: { marginTop: 8, backgroundColor: colors.surface },
//   editButton: { margin: 16, marginTop: 8, backgroundColor: colors.primary },
//   passwordButton: { marginHorizontal: 16, marginBottom: 16 },
//   buttonRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16 },
//   cancelButton: { flex: 1, marginRight: 8 },
//   saveButton: { flex: 1, marginLeft: 8 },
//   updatePasswordButton: { marginTop: 16 },
// });