import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
} from 'react-native';
import { Theme } from '../../theme/adaptiveTheme';
import { UpdateInfo, updateService } from '../../../infrastructure/services/UpdateService';
import { Sparkles, Download, X, Check } from 'lucide-react-native';
import { useI18n } from '../../../infrastructure/i18n';

interface UpdateToastProps {
  updateInfo: UpdateInfo;
  onPress: () => void;
  onDismiss: () => void;
}

export const UpdateToast: React.FC<UpdateToastProps> = ({
  updateInfo,
  onPress,
  onDismiss,
}) => {
  const { t } = useI18n();
  const [slideAnim] = useState(() => new Animated.Value(-120));
  const [opacityAnim] = useState(() => new Animated.Value(0));
  const [isDownloaded, setIsDownloaded] = useState(false);

  useEffect(() => {
    let isMounted = true;
    updateService.isApkDownloaded(updateInfo.version, updateInfo.apkSizeMb).then((ready) => {
      if (isMounted) {
        setIsDownloaded(ready);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [updateInfo.version, updateInfo.apkSizeMb]);

  useEffect(() => {
    // Slide in from top
    Animated.parallel([
      Animated.spring(slideAnim, {
        toValue: 0,
        bounciness: 8,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 250,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start();
  }, [slideAnim, opacityAnim]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -120,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: Platform.OS !== 'web',
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  return (
    <Animated.View
      style={[
        styles.toastWrapper,
        {
          transform: [{ translateY: slideAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${t.updateModal.title}: v${updateInfo.version}. ${isDownloaded ? t.updateModal.toastReadySubtitle : t.updateModal.toastSubtitle}`}
        onPress={onPress}
        style={({ pressed }) => [styles.toastCard, pressed && styles.pressed]}
      >
        {/* Left Badge Icon */}
        <View style={[styles.iconCircle, isDownloaded && styles.iconCircleReady]}>
          {isDownloaded ? (
            <Check size={16} color="#000000" strokeWidth={3} />
          ) : (
            <Sparkles size={16} color="#000000" strokeWidth={2.5} />
          )}
        </View>

        {/* Content Body */}
        <View style={styles.contentCol}>
          <View style={styles.titleRow}>
            <Text style={styles.toastTitle} numberOfLines={1}>
              {t.updateModal.toastTitlePrefix} v{updateInfo.version}
            </Text>
            {updateInfo.apkSizeMb && (
              <View style={styles.sizePill}>
                <Text style={styles.sizePillText}>{updateInfo.apkSizeMb} MB</Text>
              </View>
            )}
          </View>
          <Text style={styles.toastSubtitle} numberOfLines={1}>
            {isDownloaded ? t.updateModal.toastReadySubtitle : t.updateModal.toastSubtitle}
          </Text>
        </View>

        {/* Action Button */}
        <View style={[styles.actionBtn, isDownloaded && styles.actionBtnReady]}>
          <Download size={13} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.actionBtnText}>
            {isDownloaded ? t.updateModal.installNowBtn : t.updateModal.updateBtn}
          </Text>
        </View>

        {/* Dismiss Button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.updateModal.laterBtn}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={({ pressed }) => [styles.dismissBtn, pressed && styles.pressed]}
        >
          <X size={14} color="#000000" strokeWidth={3} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 54 : 16,
    left: 16,
    right: 16,
    zIndex: 999999,
    alignItems: 'center',
  },
  toastCard: {
    width: '100%',
    maxWidth: 520,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Theme.colors.yellow, // Cyber Yellow
    borderRadius: Theme.radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: Theme.borders.width,
    borderColor: '#000000',
    ...Theme.shadows.md,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  iconCircleReady: {
    backgroundColor: Theme.colors.mint,
  },
  contentCol: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  toastTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: 0.4,
  },
  sizePill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: Theme.radius.xs,
    borderWidth: 1,
    borderColor: '#000000',
  },
  sizePillText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#000000',
  },
  toastSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
    marginTop: 2,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#2563EB', // Electric Blue
    paddingVertical: 6,
    paddingHorizontal: 9,
    borderRadius: Theme.radius.xs,
    borderWidth: 1.5,
    borderColor: '#000000',
    marginRight: 6,
  },
  actionBtnReady: {
    backgroundColor: '#059669', // Darker Mint for contrast
  },
  actionBtnText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  dismissBtn: {
    width: 22,
    height: 22,
    borderRadius: Theme.radius.xs,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#000000',
  },
  pressed: {
    ...Theme.pressed,
  },
});
