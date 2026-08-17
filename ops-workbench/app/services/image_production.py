"""Compatibility facade for image production services.

New code should import from ``app.services.image`` submodules. This module remains
so older tests and call sites do not need to know about the internal split.
"""

from app.services.image import (
    IMAGE_TEMPLATES,
    apply_product_payload,
    build_prompt,
    create_product,
    create_task,
    list_templates,
    normalize_code,
    product_dict,
    product_storage_dir,
    split_terms,
    task_dict,
    template_by_id,
)

__all__ = [
    "IMAGE_TEMPLATES",
    "apply_product_payload",
    "build_prompt",
    "create_product",
    "create_task",
    "list_templates",
    "normalize_code",
    "product_dict",
    "product_storage_dir",
    "split_terms",
    "task_dict",
    "template_by_id",
]
