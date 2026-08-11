/** Tesla 车辆数据模块：快捷指令名称是唯一执行配置，不连接 Tesla API。 */
(() => {
  const vehicleDefaults = [
    {
      id: 'tesla-model-x', name: 'Tesla Model X', shortName: 'Model X', colorName: '白色车身',
      tone: 'white', mark: 'X', status: '状态模拟',
      controls: [
        { id: 'driverDoor', label: '打开驾驶位门', icon: '↖', shortcut: 'X_OpenDriverDoor' },
        { id: 'climate', label: '空调', icon: '°', shortcut: 'X_ClimateOn' },
        { id: 'trunk', label: '后备箱', icon: '▱', shortcut: 'X_OpenTrunk' },
        { id: 'leftWing', label: '左后门', icon: '↖', shortcut: 'X_OpenLeftRear' },
        { id: 'rightWing', label: '右后门', icon: '↗', shortcut: 'X_OpenRightRear' },
        { id: 'closeWing', label: '关闭后排车门', icon: '⇵', shortcut: 'X_CloseRearDoors' }
      ]
    },
    {
      id: 'tesla-model-3', name: 'Tesla Model 3', shortName: 'Model 3', colorName: '黑色车身',
      tone: 'black', mark: '3', status: '状态模拟',
      controls: [
        { id: 'unlock', label: '开锁', icon: '⌁', shortcut: '3_Unlock' },
        { id: 'lock', label: '锁车', icon: '▣', shortcut: '3_Lock' },
        { id: 'climate', label: '空调', icon: '°', shortcut: '3_ClimateOn' },
        { id: 'trunk', label: '后备箱', icon: '▱', shortcut: '3_OpenTrunk' },
        { id: 'closeTrunk', label: '关闭后备箱', icon: '⇵', shortcut: '3_CloseTrunk' }
      ]
    }
  ];

  window.BossData.register('vehicleData', vehicleDefaults);
})();
