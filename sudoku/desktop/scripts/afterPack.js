// 빌드된 exe에 아이콘과 파일 정보(한글 이름)를 넣는다 (wine 없이 resedit 사용)
const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;
  const ResEdit = await import('resedit');
  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(path.join(__dirname, '..', 'build', 'icon.ico')));
  const groups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const target = groups[0] || { id: 1, lang: 1033 };
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, target.id, target.lang, iconFile.icons.map(i => i.data));

  const vi = ResEdit.Resource.VersionInfo.fromEntries(res.entries)[0] || ResEdit.Resource.VersionInfo.createEmpty();
  const langs = vi.getAllLanguagesForStringValues();
  const lang = langs[0] || { lang: 1033, codepage: 1200 };
  vi.setStringValues(lang, {
    ProductName: '스도쿠 퍼즐 교실',
    FileDescription: '스도쿠 퍼즐 교실',
    CompanyName: '슈슈쌤',
    InternalName: 'SudokuClassroom',
    OriginalFilename: 'SudokuClassroom.exe',
    LegalCopyright: ''
  });
  vi.setFileVersion(1, 0, 0, 0, lang.lang);
  vi.setProductVersion(1, 0, 0, 0, lang.lang);
  vi.outputToResourceEntries(res.entries);

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
  console.log('  • afterPack: 아이콘·파일 정보 적용', path.basename(exePath));
};
