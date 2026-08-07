'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatRupiah } from '../../../../lib/formatters';

function emptyItem() {
  return { product_name: '', qty: 1, price: 0, materials_used: [] };
}

function emptyMaterialUse() {
  return { material_id: '', qty_used: 1, query: '' };
}

export default function PesananBaruPage() {
  const router = useRouter();
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [customerName, setCustomerName] = useState('');
  const [items, setItems] = useState([emptyItem()]);
  const [dp, setDp] = useState(0);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [materials, setMaterials] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [openPicker, setOpenPicker] = useState(null);
  const [openTemplatePicker, setOpenTemplatePicker] = useState(null);

  useEffect(() => {
    fetch('/api/materials')
      .then((r) => r.json())
      .then((d) => setMaterials(d.materials || []))
      .catch(() => {});
    fetch('/api/bouquet-templates')
      .then((r) => r.json())
      .then((d) => setTemplates(d.templates || []))
      .catch(() => {});
  }, []);

  const total = items.reduce((sum, it) => sum + Number(it.qty || 0) * Number(it.price || 0), 0);

  function itemHpp(it) {
    return it.materials_used.reduce((sum, mu) => {
      const mat = materials.find((m) => m.id === mu.material_id);
      const price = mat ? Number(mat.price) : 0;
      return sum + price * Number(mu.qty_used || 0);
    }, 0) * Number(it.qty || 0);
  }

  const totalHpp = items.reduce((sum, it) => sum + itemHpp(it), 0);
  const margin = total - totalHpp;

  function updateItem(idx, field, value) {
    const next = [...items];
    next[idx] = { ...next[idx], [field]: value };
    setItems(next);
  }

  function addItem() {
    setItems([...items, emptyItem()]);
  }

  function removeItem(idx) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== idx));
  }

  function addMaterialUse(itemIdx) {
    const next = [...items];
    next[itemIdx] = {
      ...next[itemIdx],
      materials_used: [...next[itemIdx].materials_used, emptyMaterialUse()],
    };
    setItems(next);
  }

  function removeMaterialUse(itemIdx, muIdx) {
    const next = [...items];
    next[itemIdx] = {
      ...next[itemIdx],
      materials_used: next[itemIdx].materials_used.filter((_, i) => i !== muIdx),
    };
    setItems(next);
  }

  function patchMaterialUse(itemIdx, muIdx, fields) {
    const next = [...items];
    const muList = [...next[itemIdx].materials_used];
    muList[muIdx] = Object.assign({}, muList[muIdx], fields);
    next[itemIdx] = Object.assign({}, next[itemIdx], { materials_used: muList });
    setItems(next);
  }

  function handleQueryChange(itemIdx, muIdx, value) {
    patchMaterialUse(itemIdx, muIdx, { query: value, material_id: '' });
    setOpenPicker(itemIdx + '-' + muIdx);
  }

  function selectMaterial(itemIdx, muIdx, mat) {
    patchMaterialUse(itemIdx, muIdx, { material_id: mat.id, query: mat.name });
    setOpenPicker(null);
  }

  function handleQtyChange(itemIdx, muIdx, value) {
    patchMaterialUse(itemIdx, muIdx, { qty_used: value });
  }

  function applyTemplate(itemIdx, tpl) {
    const muList = (tpl.bouquet_template_materials || []).map((tm) => ({
      material_id: tm.material_id,
      qty_used: tm.qty_used,
      query: tm.materials ? tm.materials.name : '',
    }));
    const next = [...items];
    next[itemIdx] = {
      ...next[itemIdx],
      product_name: tpl.name,
      price: tpl.price,
      materials_used: muList.length > 0 ? muList : [emptyMaterialUse()],
    };
    setItems(next);
    setOpenTemplatePicker(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!customerName.trim()) {
      setError('Nama customer wajib diisi');
      return;
    }
    if (items.some((it) => !it.product_name.trim())) {
      setError('Semua nama produk wajib diisi');
      return;
    }

    setSaving(true);
    try {
      const itemsPayload = items.map((it) => ({
        product_name: it.product_name,
        qty: it.qty,
        price: it.price,
        materials_used: it.materials_used
          .filter((mu) => mu.material_id && Number(mu.qty_used) > 0)
          .map((mu) => {
            const mat = materials.find((m) => m.id === mu.material_id);
            return {
              material_id: mu.material_id,
              qty_used: mu.qty_used,
              price: mat ? mat.price : 0,
            };
          }),
      }));

      const res = await fetch('/api/orders', {
        method:
