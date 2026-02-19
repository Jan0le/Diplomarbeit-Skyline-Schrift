import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useAuth } from '../contexts/AuthContext';
import { Colors, Typography, Spacing, BorderRadius } from '../constants/DesignTokens';

type Props = {
  tripId?: string;
};

export default function TripUsersTab({ tripId }: Props) {
  const { memberships, currentCompanyId, currentCompanyRole } = useAuth();

  const getRoleIcon = (role: string): keyof typeof MaterialIcons.glyphMap => {
    switch (role) {
      case 'admin': return 'admin-panel-settings';
      case 'manager': return 'manage-accounts';
      default: return 'person';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return Colors.primary.main;
      case 'manager': return '#FFC107';
      default: return Colors.status.info;
    }
  };

  return (
    <View style={styles.container}>
      {/* Company info card */}
      {currentCompanyId && (
        <Animated.View entering={FadeInDown.delay(100).springify()}>
          <View style={styles.companyInfoCard}>
            <LinearGradient
              colors={[Colors.background.secondary, Colors.background.primary]}
              style={styles.companyInfoGradient}
            >
              <View style={styles.companyInfoHeader}>
                <View style={styles.companyInfoIcon}>
                  <MaterialIcons name="business" size={20} color={Colors.primary.main} />
                </View>
                <View style={styles.companyInfoText}>
                  <Text style={styles.companyInfoTitle}>Company</Text>
                  <Text style={styles.companyInfoId} numberOfLines={1}>{currentCompanyId}</Text>
                </View>
                {currentCompanyRole && (
                  <View style={[styles.roleBadge, { backgroundColor: getRoleColor(currentCompanyRole) + '22' }]}>
                    <Text style={[styles.roleBadgeText, { color: getRoleColor(currentCompanyRole) }]}>
                      {currentCompanyRole.charAt(0).toUpperCase() + currentCompanyRole.slice(1)}
                    </Text>
                  </View>
                )}
              </View>
            </LinearGradient>
          </View>
        </Animated.View>
      )}

      {/* Members list */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Team Members</Text>
        <Text style={styles.memberCount}>{memberships.length}</Text>
      </View>

      {memberships.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(200).springify()}>
          <View style={styles.emptyState}>
            <MaterialIcons name="group-add" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyTitle}>No Team Members</Text>
            <Text style={styles.emptySubtitle}>
              Invite colleagues under Company → Invite
            </Text>
            <Pressable
              style={styles.inviteBtn}
              onPress={() => router.push('/company')}
            >
              <LinearGradient
                colors={[Colors.primary.main, Colors.primary.light]}
                style={styles.inviteBtnGradient}
              >
                <MaterialIcons name="person-add" size={16} color="#fff" />
                <Text style={styles.inviteBtnText}>Invite Members</Text>
              </LinearGradient>
            </Pressable>
          </View>
        </Animated.View>
      ) : (
        <View style={styles.membersList}>
          {memberships.map((m, idx) => (
            <Animated.View
              key={`${m.companyId}-${m.userId}`}
              entering={FadeInDown.delay(200 + idx * 80).springify()}
            >
              <View style={styles.memberCard}>
                <LinearGradient
                  colors={[Colors.background.secondary, Colors.background.primary]}
                  style={styles.memberCardGradient}
                >
                  <View style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { borderColor: getRoleColor(m.role) + '55' }]}>
                      <MaterialIcons
                        name={getRoleIcon(m.role)}
                        size={20}
                        color={getRoleColor(m.role)}
                      />
                    </View>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName} numberOfLines={1}>
                        {m.userId}
                      </Text>
                      <View style={styles.memberMeta}>
                        <View style={[styles.memberRoleDot, { backgroundColor: getRoleColor(m.role) }]} />
                        <Text style={styles.memberRole}>
                          {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
                        </Text>
                      </View>
                    </View>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          ))}
        </View>
      )}

      {/* Footer hint */}
      <View style={styles.hintRow}>
        <MaterialIcons name="info-outline" size={14} color={Colors.text.tertiary} />
        <Text style={styles.hintText}>
          Assign members to trips via the Company dashboard
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },

  // Company info
  companyInfoCard: {
    borderRadius: BorderRadius['2xl'],
    overflow: 'hidden',
  },
  companyInfoGradient: {
    padding: Spacing.lg,
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  companyInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  companyInfoIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    backgroundColor: 'rgba(255,25,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfoText: {
    flex: 1,
  },
  companyInfoTitle: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  companyInfoId: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: {
    fontSize: Typography.fontSize.xs,
    fontFamily: Typography.fontFamily.display,
    letterSpacing: 0.5,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  memberCount: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.tertiary,
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderRadius: BorderRadius['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    borderStyle: 'dashed',
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
    marginTop: Spacing.md,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  inviteBtn: {
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  inviteBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: 10,
    gap: 6,
  },
  inviteBtnText: {
    color: '#fff',
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.display,
  },

  // Members list
  membersList: {
    gap: Spacing.sm,
  },
  memberCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
  },
  memberCardGradient: {
    padding: 14,
    borderRadius: BorderRadius.xl,
    borderWidth: 1,
    borderColor: Colors.border.primary,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  memberAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255,255,255,0.04)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily.display,
    color: Colors.text.primary,
  },
  memberMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 3,
  },
  memberRoleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  memberRole: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.secondary,
  },

  // Hint
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: Spacing.sm,
  },
  hintText: {
    fontSize: Typography.fontSize.sm,
    fontFamily: Typography.fontFamily.regular,
    color: Colors.text.tertiary,
    flex: 1,
  },
});