import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface AudioVisualizerProps {
    isRecording: boolean;
    isPaused: boolean;
    volume: number; // 0 to 100
    isDark?: boolean;
    size?: 'small' | 'normal';
}

export const AudioVisualizer = ({
    isRecording,
    isPaused,
    volume,
    isDark,
    size = 'normal',
}: AudioVisualizerProps): React.JSX.Element => {
    const isSmall = size === 'small';
    const barsCount = isSmall ? 7 : 9;

    // Initialize with heights as Animated values (default idle height 4)
    // We use a fixed length array of 9 for stable ref, sharing the same Animated values
    const anims = useRef(Array.from({ length: 9 }, () => new Animated.Value(4))).current;

    useEffect(() => {
        const activeAnims = anims.slice(0, barsCount);

        if (!isRecording) {
            activeAnims.forEach((anim) => {
                Animated.spring(anim, {
                    toValue: 4,
                    useNativeDriver: false,
                    tension: 40,
                }).start();
            });
            return;
        }

        if (isPaused) {
            activeAnims.forEach((anim) => {
                Animated.spring(anim, {
                    toValue: 6,
                    useNativeDriver: false,
                    friction: 4,
                }).start();
            });
            return;
        }

        // Distribute volume levels across bars to form a wave shape centered in the middle
        activeAnims.forEach((anim, i) => {
            const distanceToCenter = Math.abs(i - Math.floor(barsCount / 2));
            const centerFactor = Math.max(0.15, 1 - distanceToCenter * 0.18);

            // Volume is 0-100, we map it to bar heights from 4 to 26 for small and 6 to 65 for normal
            const minHeight = isSmall ? 4 : 6;
            const maxHeight = isSmall ? 26 : 65;
            const range = maxHeight - minHeight;
            const baseHeight = minHeight + (volume / 100) * range;
            const targetHeight = baseHeight * centerFactor * (0.85 + Math.random() * 0.3);

            Animated.timing(anim, {
                toValue: Math.min(maxHeight, Math.max(minHeight, targetHeight)),
                duration: 80,
                useNativeDriver: false,
            }).start();
        });
    }, [volume, isRecording, isPaused, anims, barsCount, isSmall]);

    return (
        <View style={[
            styles.container,
            isDark && styles.containerDark,
            isSmall && styles.containerSmall
        ]}>
            {anims.slice(0, barsCount).map((anim, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.bar,
                        isSmall && styles.barSmall,
                        {
                            height: anim,
                            backgroundColor: isPaused
                                ? (isDark ? '#475569' : '#94a3b8')
                                : (isDark ? '#60a5fa' : '#3b82f6'),
                        },
                    ]}
                />
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        height: 90,
        backgroundColor: '#ffffff',
        borderRadius: 16,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
    },
    containerDark: {
        backgroundColor: '#1e293b',
        borderColor: '#334155',
        shadowColor: '#000000',
        shadowOpacity: 0.25,
    },
    containerSmall: {
        height: 36,
        backgroundColor: 'transparent',
        borderWidth: 0,
        paddingHorizontal: 2,
        shadowColor: 'transparent',
        shadowOpacity: 0,
        shadowRadius: 0,
        elevation: 0,
        gap: 4,
    },
    bar: {
        width: 6,
        borderRadius: 3,
    },
    barSmall: {
        width: 3.5,
        borderRadius: 1.75,
    },
});
