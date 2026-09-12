# Ecommerce Content Platform

[中文](README.md) | [English](README_EN.md)

Ecommerce Content Platform is a production workbench for short-video commerce teams. It focuses on video asset organization, copywriting and voice-over, Jianying draft assembly, and AI video generation.

The actively maintained version is on the [`content-platform`](../../tree/content-platform) branch. This `main` branch retains the historical 2.0 codebase for reference only.

## Current Product Scope

- **Video production:** manage products, tags, video assets, copy, narration subtitles, voices, and background music, then assemble editable Jianying drafts.
- **AI video:** manage product information and creative direction, generate and refine shot lists and prompts, track provider video jobs, and run ComfyUI workflows.
- **Model configuration:** retained as a supporting backend capability rather than a standalone business module.

## Former Image-Production Module

Version 2.0 included an ecommerce image-production module covering photography assets, product groups, AI product images, and marketplace image slots. That module has now been removed from the Ecommerce Content Platform frontend, API, and service code and is outside the actively maintained product scope.

Some historical database tables and the Alembic migration chain remain in the maintained branch so existing installations can be upgraded or rolled back safely. Retired image-production APIs are no longer exposed.

## Project Boundary

This project is limited to content production. Store operations, live-commerce analytics, advertising, orders and refunds, customer service, warehousing, finance, and operational reviews belong to the separate Douyin Store Management Platform.

## Current Version

For the complete project overview, repository layout, setup instructions, and verification commands, see the maintained branch:

- [中文介绍](../../blob/content-platform/README.md)
- [English introduction](../../blob/content-platform/README_EN.md)

Runtime databases, uploaded assets, generated media, caches, API keys, and provider credentials must not be committed to Git.
