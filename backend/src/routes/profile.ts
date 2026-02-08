import { Router } from 'express';
import {
  getProfile,
  updateBasicInfo,
  updateAvatar,
  changePassword,
  getPreferences,
  updatePreferences,
  getDevices,
  revokeDevice,
  revokeAllDevices,
  setupTwoFactor,
  verifyTwoFactor,
  disableTwoFactor,
  getSignature,
  updateSignature,
  exportPersonalData,
} from '../controllers/profileController';
import { authMiddleware } from '../middleware/auth';
import { upload } from '../middleware/upload';

const router = Router();

// 所有个人设置路由都需要认证
router.use(authMiddleware);

/**
 * @route   GET /api/profile
 * @desc    获取当前用户完整个人资料
 * @access  Private
 */
router.get('/', getProfile);

/**
 * @route   PUT /api/profile/basic
 * @desc    更新基础信息（姓名、邮箱、手机号、职位）
 * @access  Private
 */
router.put('/basic', updateBasicInfo);

/**
 * @route   POST /api/profile/avatar
 * @desc    上传/更新头像
 * @access  Private
 */
router.post('/avatar', upload.single('avatar'), updateAvatar);

/**
 * @route   POST /api/profile/change-password
 * @desc    修改密码
 * @access  Private
 */
router.post('/change-password', changePassword);

/**
 * @route   GET /api/profile/preferences
 * @desc    获取用户偏好设置
 * @access  Private
 */
router.get('/preferences', getPreferences);

/**
 * @route   PUT /api/profile/preferences
 * @desc    更新用户偏好设置
 * @access  Private
 */
router.put('/preferences', updatePreferences);

/**
 * @route   GET /api/profile/devices
 * @desc    获取登录设备列表
 * @access  Private
 */
router.get('/devices', getDevices);

/**
 * @route   DELETE /api/profile/devices/:deviceId
 * @desc    踢出指定设备
 * @access  Private
 */
router.delete('/devices/:deviceId', revokeDevice);

/**
 * @route   DELETE /api/profile/devices
 * @desc    踢出所有其他设备
 * @access  Private
 */
router.delete('/devices', revokeAllDevices);

/**
 * @route   POST /api/profile/2fa/setup
 * @desc    设置双因素认证（生成密钥和二维码）
 * @access  Private
 */
router.post('/2fa/setup', setupTwoFactor);

/**
 * @route   POST /api/profile/2fa/verify
 * @desc    验证并启用双因素认证
 * @access  Private
 */
router.post('/2fa/verify', verifyTwoFactor);

/**
 * @route   POST /api/profile/2fa/disable
 * @desc    禁用双因素认证
 * @access  Private
 */
router.post('/2fa/disable', disableTwoFactor);

/**
 * @route   GET /api/profile/signature
 * @desc    获取签名设置
 * @access  Private
 */
router.get('/signature', getSignature);

/**
 * @route   PUT /api/profile/signature
 * @desc    更新签名
 * @access  Private
 */
router.put('/signature', updateSignature);

/**
 * @route   GET /api/profile/export
 * @desc    导出个人数据
 * @access  Private
 */
router.get('/export', exportPersonalData);

export default router;
