/**
 * 卡尔曼滤波器实现
 * 用于平滑手部关键点数据，减少抖动
 */

class KalmanFilter {
  /**
   * 创建一个卡尔曼滤波器实例
   * @param {Object} options 滤波器配置选项
   * @param {Number} options.R 测量噪声 - 越大表示传感器数据越不可靠 (默认: 0.01)
   * @param {Number} options.Q 过程噪声 - 越大表示系统状态变化越快 (默认: 0.1)
   * @param {Number} options.A 状态转移矩阵 (默认: 1)
   * @param {Number} options.B 控制输入矩阵 (默认: 0)
   * @param {Number} options.C 测量矩阵 (默认: 1)
   */
  constructor(options = {}) {
    this.R = options.R !== undefined ? options.R : 0.01;
    this.Q = options.Q !== undefined ? options.Q : 0.1;
    this.A = options.A !== undefined ? options.A : 1;
    this.C = options.C !== undefined ? options.C : 1;
    this.B = options.B !== undefined ? options.B : 0;
    this.cov = options.cov !== undefined ? options.cov : NaN;
    this.x = options.x !== undefined ? options.x : NaN; // 初始状态
  }

  /**
   * 滤波一个测量值并返回滤波后的估计值
   * @param {Number} z 测量值
   * @param {Number} u 控制输入 (可选)
   * @returns {Number} 滤波后的值
   */
  filter(z, u = 0) {
    if (isNaN(this.x)) {
      this.x = (1 / this.C) * z;
      this.cov = (1 / this.C) * this.R * (1 / this.C);
    } else {
      // 预测步骤
      const predX = this.A * this.x + this.B * u;
      const predCov = this.A * this.cov * this.A + this.Q;

      // 更新步骤 (修正预测)
      const K = predCov * this.C * (1 / (this.C * predCov * this.C + this.R));
      this.x = predX + K * (z - this.C * predX);
      this.cov = predCov - K * this.C * predCov;
    }

    return this.x;
  }

  /**
   * 获取当前状态估计，不进行更新
   * @returns {Number} 当前状态估计
   */
  lastValue() {
    return this.x;
  }

  /**
   * 重置滤波器状态
   */
  reset() {
    this.x = NaN;
    this.cov = NaN;
  }

  /**
   * 设置当前状态，不确定性保持不变
   * @param {Number} x 新状态值
   */
  setState(x) {
    this.x = x;
  }

  /**
   * 设置测量噪声
   * @param {Number} r 新的测量噪声值
   */
  setMeasurementNoise(r) {
    this.R = r;
  }

  /**
   * 设置过程噪声
   * @param {Number} q 新的过程噪声值
   */
  setProcessNoise(q) {
    this.Q = q;
  }
}

export default KalmanFilter; 