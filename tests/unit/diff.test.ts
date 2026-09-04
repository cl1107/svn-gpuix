import { describe, expect, test } from 'bun:test';
import { countPatchLines } from '../../src/domain/diff';
import { classifyDiffOutput, classifyRevisionDiffOutput } from '../../src/services/svn/diff';

describe('classifyDiffOutput', () => {
  test('普通 git patch 是 text', () => {
    const patch = 'diff --git a/a.ts b/a.ts\n--- a/a.ts\n+++ b/a.ts\n@@ -1 +1 @@\n-old\n+new\n';
    expect(classifyDiffOutput(patch, '')).toEqual({ kind: 'text', patch });
  });

  test('binary 提示归为 binary', () => {
    expect(
      classifyDiffOutput(
        'Index: photo.png\n===================================================================\nCannot display: file marked as a binary type.\n',
        'svn: E200009: Cannot display: file marked as a binary type.\n',
      ),
    ).toEqual({ kind: 'binary' });
    expect(classifyDiffOutput('diff --git a/a.bin b/a.bin\nGIT binary patch\nliteral 4\n', '')).toEqual({
      kind: 'binary',
    });
  });

  test('未纳入版本控制归为 unversioned', () => {
    expect(classifyDiffOutput('', "svn: E200009: 'scratch.txt' is not under version control\n")).toEqual({
      kind: 'unversioned',
    });
  });
});

describe('classifyRevisionDiffOutput', () => {
  test('同一 revision 同时有文本与二进制变更时保留完整 patch', () => {
    const patch = `diff --git a/readme.txt b/readme.txt
--- a/readme.txt
+++ b/readme.txt
@@ -1 +1 @@
-old
+new
diff --git a/photo.bin b/photo.bin
Cannot display: file marked as a binary type.
`;
    expect(classifyRevisionDiffOutput(patch, '')).toEqual({ kind: 'text', patch });
  });

  test('revision 只有二进制变更时返回 binary', () => {
    expect(
      classifyRevisionDiffOutput(
        'diff --git a/photo.bin b/photo.bin\nCannot display: file marked as a binary type.\n',
        '',
      ),
    ).toEqual({ kind: 'binary' });
  });
});

describe('countPatchLines', () => {
  test('忽略文件头，只数内容行', () => {
    const patch = `diff --git a/a.ts b/a.ts
--- a/a.ts
+++ b/a.ts
@@ -1,2 +1,3 @@
 context
-old
+new
+more
`;
    expect(countPatchLines(patch)).toEqual({ additions: 2, deletions: 1 });
  });
});
