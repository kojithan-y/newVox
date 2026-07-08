import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface AudioVisualizerProps {
    isRecording: boolean;
    isPaused: boolean;
    volume: number; // 0 to 100
    isDark?: boolean;
}

export const AudioVisualizer = ({
    isRecording,
    isPaused,
    volume,
    isDark,
}: AudioVisualizerProps): React.JSX.Element => {
    const barsCount = 9;
    // Initialize with heights as Animated values (default idle height 4)
    const anims = useRef(Array.from({ length: barsCount }, () => new Animated.Value(4))).current;

    useEffect(() => {
        if (!isRecording) {
            anims.forEach((anim) => {
                Animated.spring(anim, {
                    toValue: 4,
                    useNativeDriver: false,
                    tension: 40,
                }).start();
            });
            return;
        }

        if (isPaused) {
            anims.forEach((anim) => {
                Animated.spring(anim, {
                    toValue: 6,
                    useNativeDriver: false,
                    friction: 4,
                }).start();
            });
            return;
        }

        // Distribute volume levels across bars to form a wave shape centered in the middle
        anims.forEach((anim, i) => {
            const distanceToCenter = Math.abs(i - Math.floor(barsCount / 2));
            const centerFactor = Math.max(0.15, 1 - distanceToCenter * 0.18);

            // Volume is 0-100, we map it to bar heights from 6 to 65
            const baseHeight = 6 + (volume / 100) * 58;
            const targetHeight = baseHeight * centerFactor * (0.85 + Math.random() * 0.3);

            Animated.timing(anim, {
                toValue: Math.min(65, Math.max(6, targetHeight)),
                duration: 80,
                useNativeDriver: false,
            }).start();
        });
    }, [volume, isRecording, isPaused, anims]);

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            {anims.map((anim, index) => (
                <Animated.View
                    key={index}
                    style={[
                        styles.bar,
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
    bar: {
        width: 6,
        borderRadius: 3,
    },
});
