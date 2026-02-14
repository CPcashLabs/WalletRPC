# 验收标准（Gherkin 风格）

## AC-001 导入成功
- Given 用户输入有效助记词
- When 点击导入
- Then 进入主界面并显示地址/资产区域

## AC-002 地址校验
- Given 用户输入非法地址
- When 尝试发送
- Then 发送按钮不可执行或给出明确错误提示

## AC-003 交易超时
- Given 交易长时间未确认
- When 超过轮询策略上限
- Then 停止高频轮询并展示超时失败原因

## AC-004 Safe 去重
- Given 用户重复跟踪同链同地址 Safe
- When 再次提交
- Then 不新增重复记录，但可切换到该 Safe 上下文

## AC-005 过期提案清理
- Given Safe 当前 nonce 已推进
- When 打开队列
- Then 自动清理小于当前 nonce 的过期提案
