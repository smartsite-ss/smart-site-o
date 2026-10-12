// Copyright (c) 2025 Smart Site Team
// https://smartsite.top/
// Contact: zkxxa@qq.com, zcwebms@gmail.com

import { ConfigValidator } from '../config-validator.util';

describe('ConfigValidator', () => {
  // -------------------------------------------------------------
  // isValidHost
  // -------------------------------------------------------------
  describe('isValidHost', () => {
    it('应接受 IPv4 地址', () => {
      expect(ConfigValidator.isValidHost('127.0.0.1')).toBe(true);
      expect(ConfigValidator.isValidHost('192.168.1.1')).toBe(true);
      expect(ConfigValidator.isValidHost('10.0.0.1')).toBe(true);
      expect(ConfigValidator.isValidHost('255.255.255.255')).toBe(true);
    });

    it('应接受 localhost', () => {
      expect(ConfigValidator.isValidHost('localhost')).toBe(true);
    });

    it('应接受合法主机名', () => {
      expect(ConfigValidator.isValidHost('example.com')).toBe(true);
      expect(ConfigValidator.isValidHost('server.local')).toBe(true);
      expect(ConfigValidator.isValidHost('host-01.internal.company.com')).toBe(true);
    });

    it('应拒绝空字符串', () => {
      expect(ConfigValidator.isValidHost('')).toBe(false);
    });

    it('应拒绝格式错误的主机（结构错误）', () => {
      // 注：源码 IPV4_REGEX 仅校验段数与每段位数（1-3 位），不校验每段范围
      // 故 999.999.999.999 会通过校验；
      // 注：HOSTNAME_REGEX 接受任意数量的点分段，故 1.2.3 / 1.2.3.4.5 也合法
      // 此处仅测试结构错误：起始/末尾点、连续点、特殊字符
      expect(ConfigValidator.isValidHost('1.2.3.')).toBe(false); // 末尾点
      expect(ConfigValidator.isValidHost('1..2.3')).toBe(false); // 连续点
      expect(ConfigValidator.isValidHost('.1.2.3')).toBe(false); // 起始点
      expect(ConfigValidator.isValidHost('host with space')).toBe(false); // 含空格
      expect(ConfigValidator.isValidHost('host@invalid')).toBe(false); // 含特殊字符
    });

    it('应拒绝非法主机名', () => {
      expect(ConfigValidator.isValidHost('-invalid')).toBe(false);
      expect(ConfigValidator.isValidHost('invalid-')).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // isValidPort
  // -------------------------------------------------------------
  describe('isValidPort', () => {
    it('应接受 1-65535 范围内的端口', () => {
      expect(ConfigValidator.isValidPort(1)).toBe(true);
      expect(ConfigValidator.isValidPort(80)).toBe(true);
      expect(ConfigValidator.isValidPort(502)).toBe(true);
      expect(ConfigValidator.isValidPort(65535)).toBe(true);
    });

    it('应拒绝 0', () => {
      expect(ConfigValidator.isValidPort(0)).toBe(false);
    });

    it('应拒绝负数', () => {
      expect(ConfigValidator.isValidPort(-1)).toBe(false);
    });

    it('应拒绝大于 65535 的端口', () => {
      expect(ConfigValidator.isValidPort(65536)).toBe(false);
      expect(ConfigValidator.isValidPort(100000)).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // isInRange
  // -------------------------------------------------------------
  describe('isInRange', () => {
    it('值在范围内应返回 true', () => {
      expect(ConfigValidator.isInRange(5, 1, 10)).toBe(true);
      expect(ConfigValidator.isInRange(1, 1, 10)).toBe(true); // 边界
      expect(ConfigValidator.isInRange(10, 1, 10)).toBe(true); // 边界
    });

    it('值小于 min 应返回 false', () => {
      expect(ConfigValidator.isInRange(0, 1, 10)).toBe(false);
    });

    it('值大于 max 应返回 false', () => {
      expect(ConfigValidator.isInRange(11, 1, 10)).toBe(false);
    });

    it('min == max == value 应返回 true', () => {
      expect(ConfigValidator.isInRange(5, 5, 5)).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // validateHost
  // -------------------------------------------------------------
  describe('validateHost', () => {
    it('合法主机应返回 null', () => {
      expect(ConfigValidator.validateHost('127.0.0.1')).toBeNull();
      expect(ConfigValidator.validateHost('localhost')).toBeNull();
      expect(ConfigValidator.validateHost('example.com')).toBeNull();
    });

    it('非法主机应返回 FieldError', () => {
      const result = ConfigValidator.validateHost('invalid host');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('host');
      expect(result!.message).toContain('主机地址');
      expect(result!.message).toContain('格式无效');
    });

    it('应支持自定义 field 和 label', () => {
      const result = ConfigValidator.validateHost('invalid', 'ipAddress', 'IP 地址');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('ipAddress');
      expect(result!.message).toContain('IP 地址');
    });

    it('空字符串应返回 null（跳过校验）', () => {
      expect(ConfigValidator.validateHost('')).toBeNull();
    });
  });

  // -------------------------------------------------------------
  // validatePort
  // -------------------------------------------------------------
  describe('validatePort', () => {
    it('合法端口应返回 null', () => {
      expect(ConfigValidator.validatePort(80)).toBeNull();
      expect(ConfigValidator.validatePort(502)).toBeNull();
      expect(ConfigValidator.validatePort(65535)).toBeNull();
    });

    it('非法端口应返回 FieldError', () => {
      const result = ConfigValidator.validatePort(0);
      expect(result).not.toBeNull();
      expect(result!.field).toBe('port');
      expect(result!.message).toContain('端口号');
      expect(result!.message).toContain('1-65535');
    });

    it('应支持自定义 field 和 label', () => {
      const result = ConfigValidator.validatePort(99999, 'modbusPort', 'Modbus 端口');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('modbusPort');
      expect(result!.message).toContain('Modbus 端口');
    });

    it('undefined 端口应返回 null（跳过校验）', () => {
      expect(ConfigValidator.validatePort(undefined)).toBeNull();
    });

    it('负端口应返回 FieldError', () => {
      const result = ConfigValidator.validatePort(-1);
      expect(result).not.toBeNull();
      expect(result!.message).toContain('1-65535');
    });
  });

  // -------------------------------------------------------------
  // validateRange
  // -------------------------------------------------------------
  describe('validateRange', () => {
    it('值在范围内应返回 null', () => {
      expect(ConfigValidator.validateRange(5, 1, 10, 'field', '标签')).toBeNull();
    });

    it('值超出范围应返回 FieldError', () => {
      const result = ConfigValidator.validateRange(11, 1, 10, 'field', '标签');
      expect(result).not.toBeNull();
      expect(result!.field).toBe('field');
      expect(result!.message).toContain('标签');
      expect(result!.message).toContain('1-10');
    });

    it('值等于 min 应返回 null（边界）', () => {
      expect(ConfigValidator.validateRange(1, 1, 10, 'f', 'l')).toBeNull();
    });

    it('值等于 max 应返回 null（边界）', () => {
      expect(ConfigValidator.validateRange(10, 1, 10, 'f', 'l')).toBeNull();
    });

    it('undefined 值应返回 null（跳过校验）', () => {
      expect(ConfigValidator.validateRange(undefined, 1, 10, 'f', 'l')).toBeNull();
    });

    it('负值超出范围应返回 FieldError', () => {
      const result = ConfigValidator.validateRange(-1, 0, 100, 'field', '值');
      expect(result).not.toBeNull();
      expect(result!.message).toContain('0-100');
    });
  });

  // -------------------------------------------------------------
  // validateUrlPrefix
  // -------------------------------------------------------------
  describe('validateUrlPrefix', () => {
    it('URL 以指定前缀开头应返回 null', () => {
      expect(
        ConfigValidator.validateUrlPrefix(
          'mqtt://broker.example.com',
          ['mqtt://', 'mqtts://'],
          'url',
          'MQTT URL',
        ),
      ).toBeNull();
      expect(
        ConfigValidator.validateUrlPrefix(
          'mqtts://broker.example.com',
          ['mqtt://', 'mqtts://'],
          'url',
          'MQTT URL',
        ),
      ).toBeNull();
    });

    it('URL 不以指定前缀开头应返回 FieldError', () => {
      const result = ConfigValidator.validateUrlPrefix(
        'http://example.com',
        ['mqtt://', 'mqtts://'],
        'url',
        'MQTT URL',
      );
      expect(result).not.toBeNull();
      expect(result!.field).toBe('url');
      expect(result!.message).toContain('MQTT URL');
      expect(result!.message).toContain('mqtt://');
    });

    it('undefined URL 应返回 null（跳过校验）', () => {
      expect(ConfigValidator.validateUrlPrefix(undefined, ['mqtt://'], 'url', 'URL')).toBeNull();
    });

    it('空字符串 URL 应返回 null（跳过校验）', () => {
      expect(ConfigValidator.validateUrlPrefix('', ['mqtt://'], 'url', 'URL')).toBeNull();
    });

    it('错误信息应包含所有前缀', () => {
      const result = ConfigValidator.validateUrlPrefix(
        'invalid',
        ['mqtt://', 'mqtts://'],
        'url',
        'URL',
      );
      expect(result!.message).toContain('mqtt://');
      expect(result!.message).toContain('mqtts://');
      expect(result!.message).toContain('或');
    });
  });

  // -------------------------------------------------------------
  // validateEnum
  // -------------------------------------------------------------
  describe('validateEnum', () => {
    it('值在枚举中应返回 null', () => {
      expect(
        ConfigValidator.validateEnum('tcp', ['tcp', 'serial', 'ws'], 'transport', '传输'),
      ).toBeNull();
    });

    it('值不在枚举中应返回 FieldError', () => {
      const result = ConfigValidator.validateEnum(
        'udp',
        ['tcp', 'serial', 'ws'],
        'transport',
        '传输',
      );
      expect(result).not.toBeNull();
      expect(result!.field).toBe('transport');
      expect(result!.message).toContain('传输');
      expect(result!.message).toContain('tcp');
      expect(result!.message).toContain('serial');
      expect(result!.message).toContain('ws');
    });

    it('undefined 值应返回 null（跳过校验）', () => {
      expect(ConfigValidator.validateEnum(undefined, ['a', 'b'], 'field', '标签')).toBeNull();
    });

    it('数字枚举应正确校验', () => {
      expect(ConfigValidator.validateEnum(1, [1, 2, 3], 'mode', '模式')).toBeNull();

      const result = ConfigValidator.validateEnum(5, [1, 2, 3], 'mode', '模式');
      expect(result).not.toBeNull();
      expect(result!.message).toContain('1');
      expect(result!.message).toContain('2');
      expect(result!.message).toContain('3');
    });

    it('错误信息应使用顿号分隔', () => {
      const result = ConfigValidator.validateEnum('x', ['a', 'b', 'c'], 'field', '标签');
      expect(result!.message).toContain('a、b、c');
    });
  });
});
