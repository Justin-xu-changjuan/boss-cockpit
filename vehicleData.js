/** Tesla 车辆数据模块：快捷指令名称是唯一执行配置，不连接 Tesla API。 */
const vehicleDefaults = [
  {
    id: 'tesla-model-x', name: 'Tesla Model X', shortName: 'Model X', colorName: '白色车身',
    tone: 'white', mark: 'X', status: '状态模拟',
    controls: [
      { id: 'trunk', label: '打开后备箱', icon: '▱', shortcut: 'X_OpenTrunk' },
      { id: 'rightRear', label: '打开右侧后门', icon: '↗', shortcut: 'X_OpenRightRear' },
      { id: 'leftRear', label: '打开左侧后门', icon: '↖', shortcut: 'X_OpenLeftRear' },
      { id: 'driverDoor', label: '打开主驾驶门', icon: '↖', shortcut: 'X_OpenDriverDoor' },
      { id: 'closeRearDoors', label: '关闭后侧车门', icon: '⇵', shortcut: 'X_CloseRearDoors' },
      { id: 'climate', label: '打开空调', icon: '°', shortcut: 'X_ClimateOn' }
    ]
  },
  {
    id: 'tesla-model-3', name: 'Tesla Model 3', shortName: 'Model 3', colorName: '黑色车身',
    tone: 'black', mark: '3', status: '状态模拟',
    controls: [
      { id: 'trunk', label: '打开后备箱', icon: '▱', shortcut: '3_OpenTrunk' },
      { id: 'climate', label: '打开空调', icon: '°', shortcut: '3_ClimateOn' }
    ]
  }
];

const vehicleData = window.BossData.register('vehicleData', vehicleDefaults);
