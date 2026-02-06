import { describe, it, expect } from 'vitest';
import { parseTaskNotification, formatTaskNotification } from '../../src/utils/format.js';

describe('parseTaskNotification', () => {
  const sampleContent = `<task-notification>
<task-id>a691954</task-id>
<status>completed</status>
<summary>Agent "迁移DAO" completed</summary>
<result>迁移已完成</result>
<usage>total_tokens: 13074
tool_uses: 6
duration_ms: 26263</usage>
</task-notification>
Full transcript available at: /tmp/tasks/a691954.output`;

  it('应正确解析 task notification', () => {
    const result = parseTaskNotification(sampleContent);
    expect(result).not.toBeNull();
    expect(result!.taskId).toBe('a691954');
    expect(result!.status).toBe('completed');
    expect(result!.summary).toBe('Agent "迁移DAO" completed');
    expect(result!.result).toBe('迁移已完成');
    expect(result!.usage).toContain('total_tokens: 13074');
    expect(result!.transcript).toBe('/tmp/tasks/a691954.output');
  });

  it('应返回 null 对于非 task notification 内容', () => {
    expect(parseTaskNotification('Hello world')).toBeNull();
  });
});

describe('formatTaskNotification', () => {
  it('应正确格式化为英文', () => {
    const data = {
      taskId: 'abc123',
      status: 'completed',
      summary: 'Test task',
      result: 'Done',
      usage: 'tokens: 100',
      transcript: '/tmp/test.output',
    };
    const formatted = formatTaskNotification(data, 'en');
    expect(formatted).toContain('| **Task ID** | abc123 |');
    expect(formatted).toContain('| **Status** | completed |');
    expect(formatted).toContain('**Result:**');
    expect(formatted).toContain('Done');
  });

  it('应正确格式化为中文', () => {
    const data = {
      taskId: 'abc123',
      status: 'completed',
      summary: '测试任务',
      result: '完成',
      usage: 'tokens: 100',
      transcript: '/tmp/test.output',
    };
    const formatted = formatTaskNotification(data, 'zh');
    expect(formatted).toContain('| **任务ID** | abc123 |');
    expect(formatted).toContain('| **状态** | completed |');
  });
});
