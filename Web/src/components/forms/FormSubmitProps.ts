export interface FormSubmitProps {
  onSubmit: (data: any) => void;
  onSaveDraft?: (data: any) => void;
  defaultValues?: any;
  isReadonly?: boolean;
}
