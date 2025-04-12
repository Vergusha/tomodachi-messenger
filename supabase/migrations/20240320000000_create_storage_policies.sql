-- Включаем RLS для storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Политика для чтения аватаров (публичный доступ)
CREATE POLICY "Публичный доступ к аватарам"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Политика для загрузки аватаров (только для авторизованных пользователей)
CREATE POLICY "Загрузка аватаров для авторизованных пользователей"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика для обновления аватаров (только для владельца)
CREATE POLICY "Обновление аватаров для владельца"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Политика для удаления аватаров (только для владельца)
CREATE POLICY "Удаление аватаров для владельца"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  (storage.foldername(name))[1] = auth.uid()::text
); 