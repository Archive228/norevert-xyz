// NV-01 kinematic table from description/nv01.urdf (ROBOTO_ORIGIN / RPO V2).
// Offsets are in Three.js coordinates: x = robot left, y = up, z = forward  (three = (urdf_y, urdf_z, urdf_x)).
// axis: joint axis in the parent-rotated frame, same mapping.
export const BASE_Y = 0.755;

export const LINKS = [
  { name: "base_link", parent: null, offset: [0, 0, 0], axis: null, joint: null },
  { name: "torso_link", parent: "base_link", offset: [0, 0.0672, -0.0282], axis: [0, 1, 0], joint: "torsoYaw" },

  { name: "left_arm_pitch_link", parent: "torso_link", offset: [0.12175, 0.20618, 0], axis: [1, 0, 0], joint: "shPitchL" },
  { name: "left_arm_roll_link", parent: "left_arm_pitch_link", offset: [0.056, 0, 0.02], axis: [0, 0, 1], joint: "shRollL" },
  { name: "left_arm_yaw_link", parent: "left_arm_roll_link", offset: [0, -0.05, -0.02], axis: [0, -1, 0], joint: "shYawL" },
  { name: "left_elbow_pitch_link", parent: "left_arm_yaw_link", offset: [0.02, -0.18875, 0], axis: [1, 0, 0], joint: "elPitchL" },
  { name: "left_elbow_yaw_link", parent: "left_elbow_pitch_link", offset: [-0.02, 0, 0.05], axis: [0, 0, 1], joint: "elYawL" },

  { name: "right_arm_pitch_link", parent: "torso_link", offset: [-0.12175, 0.20618, 0], axis: [1, 0, 0], joint: "shPitchR" },
  { name: "right_arm_roll_link", parent: "right_arm_pitch_link", offset: [-0.056, 0, 0.02], axis: [0, 0, 1], joint: "shRollR" },
  { name: "right_arm_yaw_link", parent: "right_arm_roll_link", offset: [0, -0.05, -0.02], axis: [0, -1, 0], joint: "shYawR" },
  { name: "right_elbow_pitch_link", parent: "right_arm_yaw_link", offset: [-0.02, -0.18875, 0], axis: [1, 0, 0], joint: "elPitchR" },
  { name: "right_elbow_yaw_link", parent: "right_elbow_pitch_link", offset: [0.02, 0, 0.05], axis: [0, 0, 1], joint: "elYawR" },

  { name: "left_thigh_yaw_link", parent: "base_link", offset: [0.0725, -0.051778, -0.071093], axis: [0, -0.86603, -0.5], joint: "hipYawL" },
  { name: "left_thigh_roll_link", parent: "left_thigh_yaw_link", offset: [0, -0.072346, -0.017693], axis: [0, -0.5, 0.86603], joint: "hipRollL" },
  { name: "left_thigh_pitch_link", parent: "left_thigh_roll_link", offset: [0.02085, -0.035, 0.060622], axis: [1, 0, 0], joint: "hipPitchL" },
  { name: "left_knee_link", parent: "left_thigh_pitch_link", offset: [0, -0.25, 0], axis: [1, 0, 0], joint: "kneeL" },
  { name: "left_ankle_pitch_link", parent: "left_knee_link", offset: [-0.02085, -0.3, 0], axis: [1, 0, 0], joint: "anklePitchL" },
  { name: "left_ankle_roll_link", parent: "left_ankle_pitch_link", offset: [0, 0, 0], axis: [0, 0, 1], joint: "ankleRollL" },

  { name: "right_thigh_yaw_link", parent: "base_link", offset: [-0.0725, -0.051778, -0.071093], axis: [0, -0.86603, -0.5], joint: "hipYawR" },
  { name: "right_thigh_roll_link", parent: "right_thigh_yaw_link", offset: [0, -0.0715958, -0.0189924], axis: [0, -0.5, 0.86603], joint: "hipRollR" },
  { name: "right_thigh_pitch_link", parent: "right_thigh_roll_link", offset: [-0.02085, -0.03575, 0.0619208], axis: [1, 0, 0], joint: "hipPitchR" },
  { name: "right_knee_link", parent: "right_thigh_pitch_link", offset: [0, -0.25, 0], axis: [1, 0, 0], joint: "kneeR" },
  { name: "right_ankle_pitch_link", parent: "right_knee_link", offset: [0.02085, -0.3, 0], axis: [1, 0, 0], joint: "anklePitchR" },
  { name: "right_ankle_roll_link", parent: "right_ankle_pitch_link", offset: [0, 0, 0], axis: [0, 0, 1], joint: "ankleRollR" },
];

export const LINK_BY_NAME = Object.fromEntries(LINKS.map((l) => [l.name, l]));
