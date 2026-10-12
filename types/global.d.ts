
// 需要引用typescript库，否则会报错 $message 在 Window 上不存在类型定义


interface Window {
  $loading: any
  $message: any
  $dialog: any
  // 语言
  $t: any
  $vue: any
  // 键盘按键记录
  $KeyboardActive?: { [T: string]: boolean }
  onKeySpacePressHold?: Function

  // 编辑 JSON 的存储对象
  opener: any
}

declare type Recordable<T = any> = Record<string, T>


