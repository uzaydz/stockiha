import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DescriptionGenerator } from './DescriptionGenerator';

// Mock fetch
global.fetch = jest.fn();

describe('DescriptionGenerator', () => {
  const mockProps = {
    open: true,
    onOpenChange: jest.fn(),
    productName: 'آيفون 15 برو ماكس',
    onDescriptionGenerated: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly when open', () => {
    render(<DescriptionGenerator {...mockProps} />);
    
    expect(screen.getByText('توليد وصف المنتج')).toBeInTheDocument();
    expect(screen.getByText('استخدم الذكاء الاصطناعي لإنشاء وصف احترافي للمنتج')).toBeInTheDocument();
    expect(screen.getByText('آيفون 15 برو ماكس')).toBeInTheDocument();
  });

  it('shows product name correctly', () => {
    render(<DescriptionGenerator {...mockProps} />);
    
    expect(screen.getByText('آيفون 15 برو ماكس')).toBeInTheDocument();
  });

  it('has language selection', () => {
    render(<DescriptionGenerator {...mockProps} />);
    
    expect(screen.getByText('لغة الوصف')).toBeInTheDocument();
    expect(screen.getByText('العربية')).toBeInTheDocument();
  });

  it('has additional details field', () => {
    render(<DescriptionGenerator {...mockProps} />);
    
    expect(screen.getByText('تفاصيل إضافية لتحسين الوصف')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/مثال: منتج عالي الجودة/)).toBeInTheDocument();
  });

  it('has generate button', () => {
    render(<DescriptionGenerator {...mockProps} />);
    
    expect(screen.getByText('توليد الوصف')).toBeInTheDocument();
  });

  it('shows error when product name is empty', () => {
    render(<DescriptionGenerator {...mockProps} productName="" />);
    
    const generateButton = screen.getByText('توليد الوصف');
    fireEvent.click(generateButton);
    
    expect(screen.getByText('يرجى إدخال اسم المنتج أولاً')).toBeInTheDocument();
  });

  it('calls onOpenChange when close button is clicked', () => {
    render(<DescriptionGenerator {...mockProps} />);
    
    const closeButton = screen.getByText('إلغاء');
    fireEvent.click(closeButton);
    
    expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
  });

  it('handles successful description generation', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'وصف تجريبي للمنتج'
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<DescriptionGenerator {...mockProps} />);
    
    const generateButton = screen.getByText('توليد الوصف');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('تم توليد الوصف بنجاح')).toBeInTheDocument();
      expect(screen.getByText('وصف تجريبي للمنتج')).toBeInTheDocument();
    });
  });

  it('handles API error', async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    render(<DescriptionGenerator {...mockProps} />);
    
    const generateButton = screen.getByText('توليد الوصف');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      expect(screen.getByText('خطأ في التوليد')).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('applies generated description', async () => {
    const mockResponse = {
      choices: [
        {
          message: {
            content: 'وصف تجريبي للمنتج'
          }
        }
      ]
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    render(<DescriptionGenerator {...mockProps} />);
    
    const generateButton = screen.getByText('توليد الوصف');
    fireEvent.click(generateButton);
    
    await waitFor(() => {
      const applyButton = screen.getByText('تطبيق الوصف');
      fireEvent.click(applyButton);
      
      expect(mockProps.onDescriptionGenerated).toHaveBeenCalledWith('وصف تجريبي للمنتج');
      expect(mockProps.onOpenChange).toHaveBeenCalledWith(false);
    });
  });
}); 