import React from "react";
import { Image, StyleSheet, View } from "react-native";

export default function CenterLogoWatermark() {
  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Image source={require("@/assets/images/mks-logo.png")} style={styles.logo} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 150,
    height: 150,
    opacity: 0.08,
  },
});
