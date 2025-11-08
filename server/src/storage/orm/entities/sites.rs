use sea_orm::entity::prelude::*;
use strum_macros::EnumIter;

#[derive(Clone, Debug, PartialEq, DeriveEntityModel)]
#[sea_orm(table_name = "sites")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: String,
    pub owner_id: String,
    pub name: String,
    pub domain: Option<String>,
    pub description: String,
    pub created_at: String,
}

#[derive(Copy, Clone, Debug, EnumIter)]
pub enum Relation {}

impl RelationTrait for Relation {
    fn def(&self) -> RelationDef {
        match *self {}
    }
}

#[derive(Copy, Clone, Default, Debug, DeriveActiveModelBehavior)]
pub struct ActiveModelBehavior;
