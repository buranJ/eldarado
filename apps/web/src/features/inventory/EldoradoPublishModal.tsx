import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ExternalLink, Upload } from 'lucide-react';
import { api } from '@/api/client';
import type {
  EldoradoPublishPreview,
  EldoradoPublishResult,
  InventoryItemDto,
} from '@/api/client';
import { useToast } from '@/app/providers/toast-context';
import { Button } from '@/components/ui/Button';
import { Checkbox, FieldLabel, Select, TextInput } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { toBase } from '@/utils/money';

const textareaClass =
  'w-full rounded-md border border-line-2 bg-panel-2 px-2 py-1.5 text-[12px] text-ink placeholder:text-ink-4 focus:border-accent focus:outline-none';

const fileToDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Не удалось прочитать изображение'));
    reader.readAsDataURL(file);
  });

function FormField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <FieldLabel>{label}</FieldLabel>
      {children}
    </label>
  );
}

export function EldoradoPublishModal({
  item,
  onClose,
  onPublished,
}: {
  item: InventoryItemDto;
  onClose: () => void;
  onPublished: () => void;
}) {
  const salePrice = item.resale.manualPrice ?? item.resale.recommendedPrice;
  const toast = useToast();
  const [preview, setPreview] = useState<EldoradoPublishPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EldoradoPublishResult | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState(() => toBase(salePrice, 'USD').amount.toFixed(2));
  const [originalEmail, setOriginalEmail] = useState('yes');
  const [image, setImage] = useState<File | null>(null);
  const [accountLogin, setAccountLogin] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  const [emailProviderUrl, setEmailProviderUrl] = useState('');
  const [emailLogin, setEmailLogin] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [mfaLogin, setMfaLogin] = useState('');
  const [mfaPassword, setMfaPassword] = useState('');
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [rulesAccepted, setRulesAccepted] = useState(false);

  useEffect(() => {
    let active = true;
    void api
      .eldoradoPreview(item.id)
      .then((value) => {
        if (!active) return;
        setPreview(value);
        setTitle(value.title);
        setDescription(value.description);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason));
      })
      .finally(() => {
        if (active) setLoadingPreview(false);
      });
    return () => {
      active = false;
    };
  }, [item.id]);

  const submit = async () => {
    setError(null);
    if (!image && !preview?.sourceImageUrls.length) return setError('У позиции нет фото аккаунта');
    if (image && image.size > 10 * 1024 * 1024) return setError('Изображение должно быть не больше 10 МБ');
    const amount = Number(priceUsd.replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) return setError('Укажите цену в USD');
    if (!accountLogin.trim() || !accountPassword) {
      return setError('Укажите логин и пароль игрового аккаунта');
    }
    if (!termsAccepted || !rulesAccepted) {
      return setError('Нужно подтвердить правила Eldorado');
    }

    setSubmitting(true);
    try {
      const imageInput = image
        ? { imageDataUrl: await fileToDataUrl(image), imageFileName: image.name }
        : {};
      const published = await api.publishToEldorado(item.id, {
        title,
        description,
        priceUsd: amount,
        hasOriginalEmail: originalEmail === 'yes',
        ...imageInput,
        accountLogin,
        accountPassword,
        emailProviderUrl: emailProviderUrl || undefined,
        emailLogin: emailLogin || undefined,
        emailPassword: emailPassword || undefined,
        mfaLogin: mfaLogin || undefined,
        mfaPassword: mfaPassword || undefined,
        additionalInfo: additionalInfo || undefined,
        termsAccepted: true,
        rulesAccepted: true,
      });
      setResult(published);
      setAccountPassword('');
      setEmailPassword('');
      setMfaPassword('');
      onPublished();
      toast.push({
        tone: 'success',
        title: 'Лот опубликован на Eldorado',
        description: `ID: ${published.offerId}`,
      });
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : String(reason);
      setError(message);
      toast.push({ tone: 'error', title: 'Публикация не удалась', description: message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      open
      onClose={submitting ? () => undefined : onClose}
      title="Публикация на Eldorado"
      description={`${item.accountId} · Clash Royale · автоматическая доставка`}
      width="w-[720px]"
      footer={
        result ? (
          <>
            <Button onClick={onClose}>Закрыть</Button>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-7 items-center gap-1.5 rounded-md bg-accent px-2.5 text-[12px] font-medium text-[#0b1024]"
            >
              Открыть лот <ExternalLink size={13} />
            </a>
          </>
        ) : (
          <>
            <Button onClick={onClose} disabled={submitting}>Отмена</Button>
            <Button
              variant="success"
              icon={Upload}
              onClick={() => void submit()}
              disabled={submitting || loadingPreview || !preview}
            >
              {submitting ? 'Публикация…' : 'Опубликовать лот'}
            </Button>
          </>
        )
      }
    >
      <div className="max-h-[68vh] space-y-4 overflow-y-auto pr-1">
        {result ? (
          <div className="rounded-lg border border-[#285b35] bg-[#13251a] p-4 text-[12px] text-pos">
            Лот создан. Реквизиты переданы Eldorado и не сохранены в базе GameStock.
          </div>
        ) : (
          <>
            <div className="rounded-lg border border-[#594b25] bg-[#251f12] p-3 text-[11.5px] leading-relaxed text-[#e1ca82]">
              Используйте только реальный аккаунт, которым вы владеете. Логины и пароли
              отправятся напрямую в Eldorado для автоматической доставки и не записываются в GameStock.
            </div>

            <div className="grid grid-cols-[1fr_150px] gap-3">
              <FormField label="Заголовок">
                <TextInput value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
              </FormField>
              <FormField label="Цена за аккаунт, USD">
                <TextInput
                  inputMode="decimal"
                  placeholder="например, 29.50"
                  value={priceUsd}
                  onChange={(e) => setPriceUsd(e.target.value)}
                />
              </FormField>
            </div>

            <FormField label="Описание">
              <textarea
                className={textareaClass}
                rows={7}
                maxLength={2_000}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </FormField>

            <div className="grid grid-cols-2 gap-3">
              <FormField label="Оригинальная почта">
                <Select
                  value={originalEmail}
                  onChange={(e) => setOriginalEmail(e.target.value)}
                  options={[
                    { value: 'yes', label: 'Да' },
                    { value: 'no', label: 'Нет' },
                  ]}
                />
              </FormField>
              <FormField label="Фото аккаунта">
                {preview?.sourceImageUrls[0] && !image ? (
                  <div className="mb-2 overflow-hidden rounded-md border border-line-2 bg-panel-2">
                    <img
                      src={preview.sourceImageUrls[0]}
                      alt="Фото аккаунта с FunPay"
                      className="h-24 w-full object-cover"
                    />
                    <p className="px-2 py-1 text-[10.5px] text-ink-3">
                      Сохранено с FunPay · можно заменить
                    </p>
                  </div>
                ) : null}
                <input
                  className="block w-full text-[11px] text-ink-2 file:mr-2 file:rounded file:border-0 file:bg-panel-3 file:px-2 file:py-1 file:text-ink"
                  type="file"
                  accept="image/jpeg,image/png,image/heic,image/heif"
                  onChange={(e) => setImage(e.target.files?.[0] ?? null)}
                />
              </FormField>
            </div>

            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-[12px] font-semibold text-ink">Реквизиты игрового аккаунта</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Логин аккаунта">
                  <TextInput value={accountLogin} onChange={(e) => setAccountLogin(e.target.value)} />
                </FormField>
                <FormField label="Пароль аккаунта">
                  <TextInput
                    type="password"
                    autoComplete="new-password"
                    value={accountPassword}
                    onChange={(e) => setAccountPassword(e.target.value)}
                  />
                </FormField>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-[12px] font-semibold text-ink">Почта аккаунта (необязательно)</h3>
              <div className="grid grid-cols-3 gap-3">
                <FormField label="URL провайдера">
                  <TextInput placeholder="https://mail.google.com" value={emailProviderUrl} onChange={(e) => setEmailProviderUrl(e.target.value)} />
                </FormField>
                <FormField label="Логин почты">
                  <TextInput value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} />
                </FormField>
                <FormField label="Пароль почты">
                  <TextInput type="password" autoComplete="new-password" value={emailPassword} onChange={(e) => setEmailPassword(e.target.value)} />
                </FormField>
              </div>
            </div>

            <div className="border-t border-line pt-4">
              <h3 className="mb-3 text-[12px] font-semibold text-ink">2FA (необязательно)</h3>
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Логин 2FA">
                  <TextInput value={mfaLogin} onChange={(e) => setMfaLogin(e.target.value)} />
                </FormField>
                <FormField label="Пароль 2FA">
                  <TextInput type="password" autoComplete="new-password" value={mfaPassword} onChange={(e) => setMfaPassword(e.target.value)} />
                </FormField>
              </div>
            </div>

            <FormField label="Дополнительная информация (не вводите сюда пароли)">
              <textarea className={textareaClass} rows={3} value={additionalInfo} onChange={(e) => setAdditionalInfo(e.target.value)} />
            </FormField>

            <div className="space-y-2 border-t border-line pt-4">
              <Checkbox label="Я принимаю Terms of Service Eldorado" checked={termsAccepted} onChange={setTermsAccepted} />
              <Checkbox label="Я принимаю Seller Rules и Account Seller Rules" checked={rulesAccepted} onChange={setRulesAccepted} />
            </div>
          </>
        )}

        {loadingPreview ? <p className="text-[12px] text-ink-3">Подготавливаю данные лота…</p> : null}
        {error ? <p className="rounded-md border border-[#5e2b31] bg-[#28171a] p-2 text-[12px] text-neg">{error}</p> : null}
      </div>
    </Modal>
  );
}
