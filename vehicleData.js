/** Tesla 车辆数据模块：快捷指令名称是唯一执行配置，不连接 Tesla API。 */
(() => {
  const vehicleDefaults = [
    {
      id: 'tesla-model-x', name: 'Tesla Model X', shortName: 'Model X', colorName: '白色车身',
      tone: 'white', mark: 'X', status: '状态模拟',
      controls: [
        { id: 'unlock', label: '解锁', icon: '⌁', shortcut: 'X_Unlock' },
        { id: 'lock', label: '锁车', icon: '▣', shortcut: 'X_Lock' },
        { id: 'climate', label: '空调', icon: '°', shortcut: 'X_ClimateOn' },
        { id: 'trunk', label: '后备箱', icon: '▱', shortcut: 'X_OpenTrunk' },
        { id: 'leftWing', label: '左翼门', icon: '↖', shortcut: 'X_OpenLeftWing' },
        { id: 'rightWing', label: '右翼门', icon: '↗', shortcut: 'X_OpenRightWing' },
        { id: 'closeWing', label: '关闭双翼门', icon: '⇵', shortcut: 'X_CloseWingDoors' }
      ]
    },
    {
      id: 'tesla-model-3', name: 'Tesla Model 3', shortName: 'Model 3', colorName: '黑色车身',
      tone: 'black', mark: '3', status: '状态模拟',
      controls: [
        { id: 'unlock', label: '解锁', icon: '⌁', shortcut: '3_Unlock' },
        { id: 'lock', label: '锁车', icon: '▣', shortcut: '3_Lock' },
        { id: 'climate', label: '空调', icon: '°', shortcut: '3_ClimateOn' },
        { id: 'trunk', label: '后备箱', icon: '▱', shortcut: '3_OpenTrunk' }
      ]
    }
  ];

  window.BossData.register('vehicleData', vehicleDefaults);
})();
