'use client';

import { FormEvent, useState } from 'react';
import { Button } from '../ui/Button';

type FieldName = 'fullName' | 'email' | 'subject' | 'message';
type FormErrors = Partial<Record<FieldName, string>>;

const fieldClassName =
  'w-full border border-neutral-300 px-4 py-2.5 text-sm focus:border-neutral-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 focus-visible:ring-offset-2';

export function ContactForm() {
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const values = {
      fullName: String(formData.get('fullName') ?? '').trim(),
      email: String(formData.get('email') ?? '').trim(),
      subject: String(formData.get('subject') ?? '').trim(),
      message: String(formData.get('message') ?? '').trim(),
    };
    const nextErrors: FormErrors = {};

    if (!values.fullName) nextErrors.fullName = 'Vui lòng nhập họ và tên của bạn.';
    if (!values.email) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email của bạn.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) {
      nextErrors.email = 'Vui lòng nhập địa chỉ email hợp lệ.';
    }
    if (!values.subject) nextErrors.subject = 'Vui lòng chọn chủ đề.';
    if (!values.message) nextErrors.message = 'Vui lòng nhập nội dung tin nhắn.';

    setErrors(nextErrors);
    setIsSubmitted(false);

    const firstInvalidField = (['fullName', 'email', 'subject', 'message'] as FieldName[]).find(
      (field) => nextErrors[field],
    );

    if (firstInvalidField) {
      (form.elements.namedItem(firstInvalidField) as HTMLElement | null)?.focus();
      return;
    }

    form.reset();
    setIsSubmitted(true);
  }

  function clearFieldError(event: FormEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const field = event.currentTarget.name as FieldName;

    if (errors[field]) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
    if (isSubmitted) setIsSubmitted(false);
  }

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <div>
        <label htmlFor="fullName" className="mb-1.5 block text-sm font-medium text-neutral-700">
          Họ và tên
        </label>
        <input
          type="text"
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          aria-invalid={Boolean(errors.fullName)}
          aria-describedby={errors.fullName ? 'fullName-error' : undefined}
          className={fieldClassName}
          placeholder="Tên của bạn"
          onInput={clearFieldError}
        />
        {errors.fullName ? (
          <p id="fullName-error" className="mt-1.5 text-xs text-red-700">
            {errors.fullName}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-neutral-700">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(errors.email)}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={fieldClassName}
          placeholder="your@email.com"
          onInput={clearFieldError}
        />
        {errors.email ? (
          <p id="email-error" className="mt-1.5 text-xs text-red-700">
            {errors.email}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="subject" className="mb-1.5 block text-sm font-medium text-neutral-700">
          Chủ đề
        </label>
        <select
          id="subject"
          name="subject"
          required
          defaultValue=""
          aria-invalid={Boolean(errors.subject)}
          aria-describedby={errors.subject ? 'subject-error' : undefined}
          className={`${fieldClassName} bg-white`}
          onChange={clearFieldError}
        >
          <option value="" disabled>
            Chọn chủ đề
          </option>
          <option>Câu hỏi chung</option>
          <option>Báo cáo người bán</option>
          <option>Vấn đề đơn hàng</option>
          <option>Hỗ trợ kỹ thuật</option>
        </select>
        {errors.subject ? (
          <p id="subject-error" className="mt-1.5 text-xs text-red-700">
            {errors.subject}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor="message" className="mb-1.5 block text-sm font-medium text-neutral-700">
          Nội dung tin nhắn
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          required
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={fieldClassName}
          placeholder="Chúng tôi có thể giúp gì cho bạn?"
          onInput={clearFieldError}
        />
        {errors.message ? (
          <p id="message-error" className="mt-1.5 text-xs text-red-700">
            {errors.message}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="mt-2 w-full" size="lg">
        Gửi tin nhắn
      </Button>

      {isSubmitted ? (
        <p role="status" className="border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          Chúng tôi đã nhận được tin nhắn của bạn. Đội ngũ hỗ trợ sẽ phản hồi sớm nhất có thể.
        </p>
      ) : null}
    </form>
  );
}
